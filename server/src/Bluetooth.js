'use strict';

const { EventEmitter } = require('events');
require('polyfill-object.fromentries');  // node 10 does not have fromentries
const asyncHandler = require('express-async-handler');
require('express-async-error');

const Bluez = require('./bluez-or-fake.js');
const getDeviceType = require('./getDeviceType.js');

// https://raspberrytips.com/mac-address-on-raspberry-pi
//const PI_ADDRESS_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01'];
const PI_ADDRESS_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01', '84:7B:57', 'F8:4D:89'];  // + intel NUC and mac for debugging
//const PROPS_JSON_WHITELIST = ['Address', 'AddressType', 'Name', 'Alias', 'Connected', 'Paired', 'RSSI', 'Blocked', 'Trusted', 'LegacyPairing', 'Adapter', 'TxPower'];
const PROPS_CHANGED_BLACKLIST = ['ManufacturerData'];
const REQUEST_DISCOVERY_TIMEOUT_MS = 20 * 1000;  // 20 seconds, client configured to refresh request every 5 seconds
const REFRESH_PAIRABLE_TIMEOUT_MS = 60 * 1000;  // once a minute
const RING_POSITION_NETWORK = '1';  // note: '1', not 1

const log = console;

// don't forget about:
// bluetoothctl --agent=none
// sudo journalctl -f -u bluetooth
// sudo busctl monitor org.bluez
// sudo btmon
// sudo rm -rf /var/lib/bluetooth; sudo reboot  # reset everything bluetooth
// node-bluez needs sudo apt install libdbus-1-dev

class Bluetooth extends EventEmitter {
    async init(ringInput) {
        this.bluez = new Bluez();
        await this.bluez.init();

        // Register Agent that accepts everything when pairing and uses key 1234
        await this.bluez.registerStaticKeyAgent('1234', true);

        // listen on first bluetooth adapter
        this.adapter = await this.bluez.getAdapter();

        this.devicesMap = new Map();
        this.filter_pi_only = false;
        this.operation_pending = false;
        this.discovery_timeout = null;

        this.bluez.on('device', (...args) => this.handleDeviceEvent(...args));
        this.bluez.on('interface-removed', (...args) => log.error('we got an interface-removed event on a device??', ...args));

	let devicetype = getDeviceType();
	if (devicetype === 'LIT') {
	    this.watchRingToEnablePairable(ringInput);
	}
    }


    addWebAPI(app, io) {
	this.io = io;
	this.addRoutes(app);
	this.addSocketIOHandlers(io);
    }


    addRoutes(app) {
        app.post('/api/v1/bluetooth/pair', asyncHandler(async (req, res) => {
            log.log('bluetooth/pair', req.body);
            let data = await this.pairDevice(req.body.address);
            log.log('result', data);
            res.json(data);
        }));

        app.post('/api/v1/bluetooth/unpair', asyncHandler(async (req, res) => {
            log.log('bluetooth/unpair', req.body);
            let data = await this.unpairDevice(req.body.address);
            log.log('result', data);
            res.json(data);
        }));

        app.post('/api/v1/bluetooth/connect', asyncHandler(async (req, res) => {
            log.log('bluetooth/connect', req.body);
            let data = await this.connectDevice(req.body.address);
            log.log('result', data);
            res.json(data);
        }));

        app.post('/api/v1/bluetooth/disconnect', asyncHandler(async (req, res) => {
            log.log('bluetooth/disconnect', req.body);
            let data = await this.disconnectDevice(req.body.address);
            log.log('result', data);
            res.json(data);
        }));
    }


    addSocketIOHandlers(io) {
        io.on('connection', (socket) => {
            log.log('socket io connection');
            this.emitDevices(socket);

            socket.on('bluetooth/requestdiscovery', () => {
		this.requestDiscovery();
            });

            // socket.on('bluetooth/stopdiscovery', () => {
            //     log.log('bluetooth/stopdiscovery');
            //     this.stopDiscovery();
            // });
	});
    }


    async requestDiscovery() {
        // ask for a discovery scan to be done
        // enables discovery for 20 seconds, if not already running
        // or renews the 20 second timer
        // client should be configured to refresh request every 5 seconds
        if (!this.discovery_timeout) {
            log.log('starting discovery scan');
            await this.startDiscovery();
            await this.emitDevices();
        } else {
            this.cancelDiscoveryTimeout(this.discovery_timeout);
        }
        this.discovery_timeout = setTimeout( () => this.requestDiscoveryExpired(), REQUEST_DISCOVERY_TIMEOUT_MS);
    }


    cancelDiscoveryTimeout() {
        if (this.discovery_timeout) {
            clearTimeout(this.discovery_timeout);
            this.discovery_timeout = null;
        }
    }


    async requestDiscoveryExpired() {
	log.log('request discovery expired');
        this.discovery_timeout = null;
        await this.stopDiscovery();
    }


    async startDiscovery() {
        if (!await this.adapter.Discovering()) {
            log.log('starting bluetooth discovery');
            await this.adapter.StartDiscovery();
            await this.getAllDevices();
            await this.emitDevices();
        }
    }


    async stopDiscovery() {
        if (await this.adapter.Discovering()) {
            log.log('stopping bluetooth discovery');
            await this.adapter.StopDiscovery();
            this.cancelDiscoveryTimeout();
        }
    }


    watchRingToEnablePairable(ringInput) {
	this.ringChanged(ringInput);
	ringInput.on('change', () => this.ringChanged(ringInput));
    }


    async ringChanged(ringInput) {
	let ring_position = ringInput.getModenum();
	if (ring_position === RING_POSITION_NETWORK) {
	    await this.startPairable();
	} else {
	    await this.stopPairable();
	}
    }


    async startPairable() {
	if (this.refresh_pairable_timeout) {
	    clearTimeout(this.refresh_pairable_timeout);
	    this.refresh_pairable_timeout = undefined;
	}

	log.log('enabling discoverable and pairing');
	await this.adapter.Discoverable(true);
	await this.adapter.Pairable(true);
	
        this.refresh_pairable_timeout = setTimeout( () => this.startPairable(), REFRESH_PAIRABLE_TIMEOUT_MS);
    }


    async stopPairable() {
	if (this.refresh_pairable_timeout) {
	    clearTimeout(this.refresh_pairable_timeout);
	    this.refresh_pairable_timeout = undefined;
	}

	log.log('stopping discoverable and pairing');
	await this.adapter.Discoverable(false);
	await this.adapter.Pairable(false);
    }


    async handleDeviceEvent(address, props) {
        this.logNewDevice(props);

        if (this.devicesMap.has(address)) {
            log.warn('hmmm. device object already exists in map?');
        }

        let device = await this.getDevice(address, false).catch(log.error);
        if (!device) {
            log.error(`could not get device for ${address}!`);
            return;
        }

        this.emit('device', address, props);
        await this.emitDevices();
    }


    async handlePropertiesChangedEvent(address, props, invalidated) {
        let filtered_props = {};
        for (let prop in props) {
            if (PROPS_CHANGED_BLACKLIST.includes(prop)) {
                continue;
            }
            filtered_props[prop] = props[prop];
        }
        if (Object.keys(filtered_props).length === 0) {
            return;
        }
        props = filtered_props;

        log.debug('[CHG] Device:', address, props, invalidated);
        await this.emitDevices();
    }


    async emitDevices(socket=null) {
        if (!socket) {  // don't emit locally if we are just bootstrapping a new socket connection
            this.emit('devices', this.devices);
        }
        if (this.io) {
            let devices = await this.prepDevicesForJSON(this.devicesMap);
            //log.log('emit bluetooth/devices', { devices });
            if (socket) {  // emit just to the new socket connection
                socket.emit('bluetooth/devices', devices);
            } else {  // emit to all socket connections
                this.io.emit('bluetooth/devices', devices);
            }
        }
    }


    async prepDevicesForJSON(devicesMap) {
        //let prepped_devices = Object.fromEntries(devicesMap);  // FFFFFFFFFFFFFFF! -jon
        let prepped_devices = {};
        for (let [address, device] of devicesMap) {
            let prepped_device = {};
            let props;
            try {
                props = await device.getProperties();
            } catch(err) {
                //log.error(address, err);
                // guessing this means the device has gone?
                // so let's try this:
                this.devicesMap.delete(address);
                log.debug('[DEL]', address);
            }
            if (!props) {
                continue;
            }
            // for (let prop in props) {
            //  if (PROPS_JSON_WHITELIST.includes(prop)) {
            //      prepped_device[prop] = props[prop];
            //  }
            // }
            prepped_device = props;
            prepped_devices[address] = prepped_device;
        }
        return prepped_devices;
    }


    logNewDevice(props) {
        let format_props = (props) => { return `${props.Address}  ${props.Name || props.Address}  ${props.Paired}  ${props.Connected}  ${props.RSSI}`; };
        log.debug('[NEW] Device:', format_props(props));
    }


    async getDevice(address, warning=true) {
        let device;
        try {
            device = this.devicesMap.get(address);
            if (!device) {
                if (warning) {
                    log.warn('odd. no device object in map. this should not happen?');
                }
                device = await this.bluez.getDevice(address).catch(log.error);
                if (!device) {
                    throw new Error(`could not get device for ${address}!`);
                }
                device.on('PropertiesChanged', (...args) => this.handlePropertiesChangedEvent(address, ...args));
                this.devicesMap.set(address, device);
            }
        } catch(err) {
            log.warn('error getting device object', err);
        }
        return device;
    }


    async getAllDevices() {
        let allProps = this.bluez.getAllDevicesProps();
        for (let props of allProps) {
            if (!this.devicesMap.get(props.Address)) {
                this.logNewDevice(props);
                this.getDevice(props.Address, false);
            }
        }
        return this.devicesMap;
    }


    filterAddresses(addresses) {
        let filtered_addresses = [];
        if (!this.filter_pi_only) {
            filtered_addresses = addresses;
        } else {
            for (let address of addresses) {
                let prefix = address.split(':', 4).slice(0, 3).join(':');
                prefix = prefix.toLowerCase();
                for (let pi_address_prefix of PI_ADDRESS_PREFIXES) {
                    pi_address_prefix = pi_address_prefix.toLowerCase();
                    if (prefix === pi_address_prefix) {
                        filtered_addresses.push(address);
                        break;
                    }
                }
            }
            addresses = filtered_addresses;
        }
        return addresses;
    }


    async soloOperation(operation) {
        if (this.operation_pending) {
            throw new Error('one at a time');
        }
        this.operation_pending = true;
        try {
            await operation();
            this.operation_pending = false;
        } catch(err) {
            this.operation_pending = false;
            throw err;
        }
    }


    async pairDevice(address) {
        this.soloOperation( async () => {
            let device = await this.getDevice(address);
            log.log('pairing', address, device.Name, 'Paired: ', device.Paired, 'Connected: ', device.Connected);
            let result = await device.Pair();
            log.log('done. result:', result);
        });
    }


    async unpairDevice(address) {
        this.soloOperation( async () => {
            let device = await this.getDevice(address);
            log.log('unpairing', address, device.Name, 'Paired: ', device.Paired, 'Connected: ', device.Connected);
            let result;
            result = await device.CancelPairing();
            log.log('result:', result);
            result = await this.adapter.RemoveDevice(device);
            log.log('done. result:', result);
        });
    }


    async connectDevice(address) {
        this.soloOperation( async () => {
            let device = await this.getDevice(address);

            console.log('1');
            console.log('connecting', address, device.Name, 'Paired: ', device.Paired, 'Connected: ', device.Connected);

            //console.log('stopping discovery');
            // await this.stopDiscovery();
            // console.log('pausing');
            await new Promise((resolve) => setTimeout(resolve, 2000));

            let result;
            console.log('2');
            if (!device.Paired) {
                console.log('3');
                console.log('pairing', address, '...');
                result = await device.Pair();
                console.log('done. result:', result);
            }
            console.log('4');
            console.log('connecting...');
            console.log('5');
            try {
                console.log('5.1');
                result = await device.Connect();
                console.log('5.2');
            } catch(err) {
                console.error('error while connecting', err);
            }
            console.log('6');
            console.log('done. result:', result);

            console.log('7');
            // // this.startDiscovery();
        });
    }


    async disconnectDevice(address) {
        this.soloOperation( async () => {
            let device = await this.getDevice(address);
            log.log('disconnecting', address, device.Name, 'Paired: ', device.Paired, 'Connected: ', device.Connected);
            let result = await device.Disconnect();
            log.log('done. result:', result);
        });
    }
}


async function main() {
    log.log('start');
    let bluetooth = new Bluetooth();
    await bluetooth.init();
    await bluetooth.startDiscovery();

    let format_props = (props) => {
        let str = '';
        for (let [key, value] of Object.entries(props)) {
            if (str) {
                str += '  ';
            }
            str += `${key}:${value}`;
        }
        return str;
    };

    let found_it = false;
    bluetooth.on('devices', async (devices) => {
        if (!found_it) {
            for (let [address, device] of devices) {
                if (device.Name === 'LIT0001') {
                    log.log('found it!');
                    found_it = true;
                    log.log(format_props(device));
                    log.log('attempting to connect to it!');
                    await bluetooth.connectDevice(device.Address);
                }
            }
        }
    });
}


if (require.main === module) {
    main();
}


module.exports = Bluetooth;
