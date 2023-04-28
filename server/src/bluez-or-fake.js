'use strict';

const os = require('os');
const { EventEmitter } = require('events');

class FakeTheBluez extends EventEmitter {
    constructor() {
        super();
        console.warn('Fake Bluez module being used!');
        console.warn('This should only happen on non-linux systems!');
    }
    async init() { return; }
    async registerStaticKeyAgent() { return; }
    async getAdapter() { return new FakeAdapter(); }
    async getDevice() { return new FakeDevice(); }
    getAllDevicesProps() { return []; }
}


class FakeAdapter {
    async Discovering() { return false; }
    async StartDiscovery() { return; }
    async StopDiscovery() { return; }
    async RemoveDevice() { return; }
}


class FakeDevice extends EventEmitter {
    constructor() {
        super();
        console.error('Fake Bluez device being created! This should not happen!');
    }
    async getProperties() { return {}; }
    async Pair() { return; }
    async CancelPairing() { return; }
    async Connect() { return; }
}


let Bluez;
if (os.platform() === 'linux') {
    Bluez = require('bluez');
} else {
    console.warn('using fake Bluez module!');
    Bluez = FakeTheBluez;
}


module.exports = Bluez;
