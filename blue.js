const { EventEmitter } = require('events');
const { createBluetooth } = require('node-ble');

// https://raspberrytips.com/mac-address-on-raspberry-pi
//const PI_MAC_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01'];
const PI_MAC_PREFIXES = ['28:CD:C1', 'B8:27:EB', 'DC:26:32', 'E4:5F:01', '84:7B:57', 'F8:4D:89'];  // + intel NUC and mac for debugging
const DEVICE_CHECK_INTERVAL_MS = 1000;


class Bluetooth extends EventEmitter {
    async init() {
	let { bluetooth, destroy } = createBluetooth();
	this.bluetooth = bluetooth;
	this.destroy = destroy;
	this.adapter = await bluetooth.defaultAdapter();
	this.devices = new Map();
	this.filter_pi_only = true;
    }


    async startDiscovery() {
	if (! await this.adapter.isDiscovering()) {
	    await this.adapter.startDiscovery();
	}
	clearTimeout(this.timeout);
	this.timeout = setTimeout( () => this.checkDevices(), DEVICE_CHECK_INTERVAL_MS);
    }

	
    async stopDiscovery() {
	if (await this.adapter.isDiscovering()) {
	    await this.adapter.stopDiscovery();
	}
	clear(this.timeout);
	this.timeout = undefined;
    }

    
    async checkDevices() {
	let mac_addresses = await this.adapter.devices();
	mac_addresses = this.filterAddresses(mac_addresses);
	let devices_info = new Map();
	for (let mac_address of mac_addresses) {
	    let device;
	    if (this.devices.has(mac_address)) {
		device = this.devices.get(mac_address);
	    } else {
		device = await this.adapter.getDevice(mac_address);
		if (!device) {
		    continue;
		}
		this.devices.set(mac_address, device);
	    }
	    
	    let info = { mac_address };
	    try {
		info.name = await device.getName();
	    } catch(err) {
		//console.warn(err);
	    }
	    try {
		info.isPaired = await device.isPaired();
	    } catch(err) {
		//console.warn(err);
	    }
	    try {
		info.isConnected = await device.isConnected();
	    } catch(err) {
		//console.warn(err);
	    }
	    try {
		info.rssi = await device.getRSSI();
	    } catch(err) {
		//console.warn(err);
	    }
	    devices_info.set(info.mac_address, info);
	}
	this.emit('devices', devices_info);
	this.timeout = setTimeout( () => this.checkDevices(), DEVICE_CHECK_INTERVAL_MS);
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


    async connect_it(info) {
	if (this.connecting) {
	    return;
	}
	console.log('found', info.name, 'isPaired: ', info.isPaired, 'isConnected: ', info.isConnected);
	this.connecting = true;
	let device = this.devices.get(info.mac_address);
	let result;
	if (!info.isPaired) {
	    console.log('pairing', info.mac_address, '...');
	    result = await device.pair();
	    console.log('done. result:', result);
	}
	console.log('connecting...');
	result = await device.connect();
	console.log('done. result:', result);

	//let finalDevice = bluetooth.adaptor.getDevice(info.mac_address);
    }
}


async function main() {
    console.log('start');
    let bluetooth = new Bluetooth();
    await bluetooth.init();
    await bluetooth.startDiscovery();

    let last_devices_info;
    let format_info = (info) => { return `${info.mac_address}  ${info.name}  ${info.isPaired}  ${info.isConnected}  ${info.rssi}` };
    bluetooth.on('devices', async (devices_info) => {
	if (!last_devices_info) {
	    for (let [mac, info] of devices_info) {
		console.log(format_info(info));
		if (info.name === 'LIT0001') {
		    await bluetooth.connect_it(info);
		}
	    }
	} else {
	    for (let [key, info] of last_devices_info) {
		if (!devices_info.has(key)) {
		    console.log('[-]', format_info(info));
		}
	    }
	    for (let [key, info] of devices_info) {
		if (!last_devices_info.has(key)) {
		    console.log('[+]', format_info(info));
		    if (info.name === 'LIT0001') {
			await bluetooth.connect_it(info);
		    }
		} else if (info.isConnected !== last_devices_info.get(key).isConnected) {
		    console.log(info.isConnected ? '[1]' : '[0]', format_info(info));
		}
	    }
	}
	last_devices_info = new Map(devices_info);
    });
}


main();
