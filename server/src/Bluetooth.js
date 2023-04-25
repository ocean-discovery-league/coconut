'use strict';

const { EventEmitter } = require('events');
//const { createBluetooth } = require('node-ble');
const Bluez = require('bluez');
require('polyfill-object.fromentries');  // node 10 does not have fromentries
const asyncHandler = require('express-async-handler');
require('express-async-error');

// https://raspberrytips.com/mac-address-on-raspberry-pi
//const PI_MAC_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01'];
const PI_MAC_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01', '84:7B:57', 'F8:4D:89'];  // + intel NUC and mac for debugging
const DEVICE_CHECK_INTERVAL_MS = 1000;
const PROPS_JSON_WHITELIST = ['mac_address', 'Address', 'AddressType', 'Name', 'Alias', 'Connected', 'Paired', 'RSSI', 'Blocked', 'Trusted', 'LegacyPairing', 'Adapter', 'TxPower'];

const log = console;

// don't forget about:
// bluetoothctl --agent=none
// sudo journalctl -f -u bluetooth
// sudo busctl monitor org.bluez
// sudo btmon
// sudo rm -rf /var/lib/bluetooth; sudo reboot  # reset everything bluetooth
// node-bluez needs sudo apt install libdbus-1-dev

class Bluetooth extends EventEmitter {
    async init(app) {
	// let { bluetooth, destroy } = createBluetooth();
	//this.bluetooth = bluetooth;
	//this.destroy = destroy;
	//this.adapter = await bluetooth.defaultAdapter();
	this.bluetooth = new Bluez();
	await this.bluetooth.init();
	// Register Agent that accepts everything and uses key 1234
	await this.bluetooth.registerStaticKeyAgent('1234', true);
	// listen on first bluetooth adapter
	this.adapter = await this.bluetooth.getAdapter();
	this.devices = new Map();
	this.device_objects_cache = new Map();
	this.filter_pi_only = false;
	this.operation_pending = false;
	if (app) {
            this.router = app;
            this.routes(this.router);
	}
        await this.startDiscovery();  // FIXME
    }


    routes(router) {
        router.get('/btstatus', asyncHandler(async (req, res) => {
            //let data = await this.getStatus();
	    let data = {};
            let json = JSON.stringify(data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.get('/btscan', asyncHandler(async (req, res) => {
	    //let devices = Object.fromEntries(this.devices);  // FFFFFFFFFFFFFFF! -jon
	    let devices = {};
	    for (let [key, value] of this.devices) {
		devices[key] = value;
	    }

	    let filtered_devices = {};
	    for (let [mac_address, props] of Object.entries(devices)) {
		let device = {};

		// if (props.Name === 'LIT0001') {
		//     let json = JSON.stringify(props);
		//     if (!this.last_props || this.last_props !== json) {
		// 	console.log(props);
		// 	this.last_props = json;
		//     }
		// }

		for (let prop in props) {
		    if (PROPS_JSON_WHITELIST.includes(prop)) {
			device[prop] = props[prop];
		    }
		}
		filtered_devices[mac_address] = device;
	    }
            let json = JSON.stringify(filtered_devices);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.get('/btsignal', asyncHandler(async (req, res) => {
            //let data = await this.wireless.exec('signal_poll');
            let json = JSON.stringify(data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.post('/btconnect', asyncHandler(async (req, res) => {
            log.log('/btconnect', req.body);
            let data = await this.connectBTDevice(req.body.mac_address);
            let json = JSON.stringify(data);
            log.log('result', data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.post('/btdisconnect', asyncHandler(async (req, res) => {
            log.log('/btdisconnect');
            let data = await this.disconnectBTDevice(req.body.mac_address);
            let json = JSON.stringify(data);
            log.log('result', data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.post('/btpair', asyncHandler(async (req, res) => {
            log.log('/btpair', req.body);
            let data = await this.pairBTDevice(req.body.mac_address);
            let json = JSON.stringify(data);
            log.log('result', data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));

        router.post('/btunpair', asyncHandler(async (req, res) => {
            log.log('/btunpair');
            let data = await this.unpairBTDevice(req.body.mac_address);
            let json = JSON.stringify(data);
            log.log('result', data);
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        }));
    }


    async startDiscovery() {
	// if (! await this.adapter.isDiscovering()) {
	//     await this.adapter.startDiscovery();
	// }
	if (! await this.adapter.Discovering()) {
	    await this.adapter.StartDiscovery();
	}
	clearTimeout(this.timeout);
	this.timeout = setTimeout( () => this.checkDevices(), DEVICE_CHECK_INTERVAL_MS);
    }

	
    async stopDiscovery() {
	if (await this.adapter.isDiscovering()) {
	    await this.adapter.stopDiscovery();
	}
	clearTimeout(this.timeout);
	this.timeout = undefined;
    }

    
    async checkDevices() {
	// let mac_addresses = await this.adapter.devices();
	// mac_addresses = this.filterAddresses(mac_addresses);
	// let devices_scan = new Map();
	// for (let mac_address of mac_addresses) {
	//     let props = await this.getProps(mac_address);
	//     if (!props) {
	// 	continue;
	//     }
	//     devices_scan.set(mac_address, props);
	// }

	let allDeviceProps = await this.bluetooth.getAllDevicesProps();
	let devices_scan = new Map();
	for (let props of allDeviceProps) {
	    if (this.filter_pi_only) {
		let mac_address = props.Address;
		let prefix = mac_address.split(':', 4).slice(0, 3).join(':');
		prefix = prefix.toLowerCase();
		let accept = false;
		for (let pi_mac_prefix of PI_MAC_PREFIXES) {
		    pi_mac_prefix = pi_mac_prefix.toLowerCase();
		    if (prefix === pi_mac_prefix) {
			accept = true;
			break;
		    }
		}
		if (!accept) {
		    continue;
		}
	    }

	    devices_scan.set(props.Address, props);
	}
	
	this.devices = devices_scan;
	this.emit('devices', this.devices);
	this.timeout = setTimeout( () => this.checkDevices(), DEVICE_CHECK_INTERVAL_MS);
    }


    async getDeviceObject(mac_address) {
	let device_object;
	try {
	    device_object = this.device_objects_cache.get(mac_address);
	    if (!device_object) {
		// device_object = await this.adapter.getDevice(mac_address);
		device_object = await this.bluetooth.getDevice(mac_address);
		this.device_objects_cache.set(mac_address, device_object);
		device_object.on('PropertiesChanged', (props, invalidated) => {
		    console.log('[CHG] Device:', mac_address, props, invalidated);
		});
	    }
	} catch(err) {
	    console.warn('error getting device object', err);
	}
	return device_object;
    }


    async getProps(mac_address) {
	let device_object = await this.getDeviceObject(mac_address);
	let props;
	if (device_object) {
	    try {
		props = await device_object.helper.props();
		props.mac_address = mac_address;
	    } catch(err) {
		console.warn('error getting props from device object', err);
	    }
	}
	return props;
    }
	

    filterAddresses(mac_addresses) {
	let filtered_addresses = [];
	if (!this.filter_pi_only) {
	    filtered_addresses = mac_addresses;
	} else {
	    for (let mac_address of mac_addresses) {
		let prefix = mac_address.split(':', 4).slice(0, 3).join(':');
		prefix = prefix.toLowerCase();
		for (let pi_mac_prefix of PI_MAC_PREFIXES) {
		    pi_mac_prefix = pi_mac_prefix.toLowerCase();
		    if (prefix === pi_mac_prefix) {
			filtered_addresses.push(mac_address);
			break;
		    }
		}
	    }
	    mac_addresses = filtered_addresses;
	}
	return mac_addresses;
    }


    async solo(operation) {
	if (this.operation_pending) {
	    throw new Error('one at a time');
	}
	this.operation_pending = true;
	try {
	    await operation();
	} catch(err) {
	    this.operation_pending = false;
	    throw err;
	}
	this.operation_pending = false;
    }


    async pairBTDevice(mac_address) {
	this.solo( async () => {
	    let device_object = await this.getDeviceObject(mac_address);
	    // let props = await this.getProps(mac_address);
	    // if (!device_object || !props) {
	    // 	return;
	    // }

	    //console.log('pairing', mac_address, props.Name, 'Paired: ', props.Paired, 'Connected: ', props.Connected);
	    console.log('pairing', mac_address, device_object.Name, 'Paired: ', device_object.Paired, 'Connected: ', device_object.Connected);
	    //let result = await device_object.pair();
	    let result = await device_object.Pair();
	    console.log('done. result:', result);

	    // let finalProps = await this.getProps(mac_address);
	    // console.log({ finalProps });
	});
    }


    async unpairBTDevice(mac_address) {
	this.solo( async () => {
	    let device_object = await this.getDeviceObject(mac_address);
	    // let props = await this.getProps(mac_address);
	    // if (!device_object || !props) {
	    //     return;
	    // }

	    //console.log('unpairing', mac_address, props.Name, 'Paired: ', props.Paired, 'Connected: ', props.Connected);
	    console.log('unpairing', mac_address, device_object.Name, 'Paired: ', device_object.Paired, 'Connected: ', device_object.Connected);
	    // let result = await device_object.cancelPair();
            // let result = await this.adapter.removeDevice(mac_address);
            let result = await this.adapter.RemoveDevice(device_object);
	    console.log('done. result:', result);

	    // let finalProps = await this.getProps(mac_address);
	    // console.log({ finalProps });
	});
    }


    async XconnectBTDevice(mac_address) {
	this.solo( async () => {
	    let device_object = await this.getDeviceObject(mac_address);
	    let props = await this.getProps(mac_address);
	    if (!device_object || !props) {
	    	return;
	    }

	    console.log('1');
	    console.log('connecting', mac_address, props.Name, 'Paired: ', props.Paired, 'Connected: ', props.Connected);

	    console.log('stopping discovery');
	    // await this.stopDiscovery();
	    // console.log('pausing');
	    await new Promise((resolve) => setTimeout(resolve, 2000));

	    let result;
	    console.log('2');
	    if (!props.Paired) {
		console.log('3');
		console.log('pairing', mac_address, '...');
		result = await device_object.pair();
		console.log('done. result:', result);
	    }
	    console.log('4');
	    console.log('connecting...');
	    console.log('5');
	    try {
		console.log('5.1');
		result = await device_object.connect();
		console.log('5.2');
	    } catch(err) {
		console.error('error while connecting', err);
	    }
	    console.log('6');
	    console.log('done. result:', result);

	    console.log('7');
	    let finalProps = await this.getProps(mac_address);
	    console.log({ finalProps });
	    console.log('8');
	    // this.startDiscovery();
	});
    }


    async connectBTDevice(mac_address) {
	this.solo( async () => {
	    let device_object = await this.getDeviceObject(mac_address);

	    console.log('1');
	    console.log('connecting', mac_address, device_object.Name, 'Paired: ', device_object.Paired, 'Connected: ', device_object.Connected);

	    //console.log('stopping discovery');
	    // await this.stopDiscovery();
	    // console.log('pausing');
	    await new Promise((resolve) => setTimeout(resolve, 2000));

	    let result;
	    console.log('2');
	    if (!device_object.Paired) {
		console.log('3');
		console.log('pairing', mac_address, '...');
		result = await device_object.Pair();
		console.log('done. result:', result);
	    }
	    console.log('4');
	    console.log('connecting...');
	    console.log('5');
	    try {
		console.log('5.1');
		result = await device_object.Connect();
		console.log('5.2');
	    } catch(err) {
		console.error('error while connecting', err);
	    }
	    console.log('6');
	    console.log('done. result:', result);

	    console.log('7');
	    // let finalProps = await this.getProps(mac_address);
	    // console.log({ finalProps });
	    // console.log('8');
	    // // this.startDiscovery();
	});
    }


    async disconnectBTDevice(mac_address) {
	this.solo( async () => {
	    let device_object = await this.getDeviceObject(mac_address);
	    // let props = await this.getProps(mac_address);
	    // if (!device_object || !props) {
	    // 	return;
	    // }

	    //console.log('disconnecting', mac_address, props.Name, 'Paired: ', props.Paired, 'Connected: ', props.Connected);
	    console.log('disconnecting', mac_address, device_object.Name, 'Paired: ', device_object.Paired, 'Connected: ', device_object.Connected);
	    // let result = await device_object.disconnect();
	    let result = await device_object.Disconnect();
	    console.log('done. result:', result);

	    // let finalProps = await this.getProps(mac_address);
	    // console.log({ finalProps });
	});
    }
}


// async function main() {
//     console.log('start');
//     let bluetooth = new Bluetooth();
//     await bluetooth.init();
//     //await bluetooth.startDiscovery();

//     let last_devices;
//     let format_props = (props) => { return `${props.mac_address}  ${props.Name}  ${props.Paired}  ${props.Connected}  ${props.RSSI}` };
//     // let format_props = (props) => {
//     // 	let str = '';
//     // 	for (let [key, value] of Object.entries(props)) {
//     // 	    if (str) {
//     // 		str += '  ';
//     // 	    }
//     // 	    str += `${key}:${value}`;
//     // 	}
//     // 	return str;
//     // }
//     bluetooth.on('devices', async (devices) => {
// 	if (!last_devices) {
// 	    for (let [mac, props] of devices) {
// 		console.log(format_props(props));
// 		if (props.Name === 'LIT0001') {
// 		    await bluetooth.connectBTDevice(props.mac_address);
// 		}
// 	    }
// 	} else {
// 	    for (let [key, props] of last_devices) {
// 		if (!devices.has(key)) {
// 		    console.log('[-]', format_props(props));
// 		}
// 	    }
// 	    for (let [key, props] of devices) {
// 		if (!last_devices.has(key)) {
// 		    console.log('[+]', format_props(props));
// 		    if (props.Name === 'LIT0001') {
// 			await bluetooth.connectBTDevice(props.mac_address);
// 		    }
// 		} else if (props.Connected !== last_devices.get(key).Connected) {
// 		    console.log(props.Connected ? '[1]' : '[0]', format_props(props));
// 		}
// 	    }
// 	}
// 	last_devices = new Map(devices);
//     });
// }


if (require.main === module) {
    main();
}


module.exports = Bluetooth;
