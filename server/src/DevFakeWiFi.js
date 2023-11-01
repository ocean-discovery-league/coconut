'use strict';

const os = require('os');
const fsP = require('fs').promises;
const asyncHandler = require('express-async-handler');
require('express-async-error');

const log = Object.assign({}, console);


let connected = true;

let fake_status_connected_data = {
    'bssid':'f0:99:bf:0c:a1:4e',
    'freq':'2462',
    'ssid':'Fake SquidDisco',
    'id':3,
    'mode':'station',
    'pairwise_cipher':'CCMP',
    'group_cipher':'CCMP',
    'key_mgmt':'WPA2-PSK',
    'wpa_state':'COMPLETED',
    'ip_address':'192.193.194.194',
    'p2p_device_address':'ba:27:eb:d8:b6:82',
    'address':'b8:27:eb:d8:b6:82',
    'uuid':'2461349b-faf5-5ca4-baf9-ff142c083a71'
};

let fake_status_disconnected_data = {
    wpa_state: 'DISCONNECTED'
};

let fake_scan_data = [
    {'address':'f0:99:bf:0c:a1:4e',
     'channel':11,
     'frequency':2.462,
     'mode':'master',
     'quality':70,
     'signal':-31,
     'ssid':'Fake SquidDisco',
     'security':'wpa2'},
    {'address':'f2:4e:a1:0c:bf:90',
     'channel':11,
     'frequency':2.462,
     'mode':'master',
     'quality':70,
     'signal':-25,
     'ssid':'notrealwifi@squiddisco.com',
     'security':'open'}
];

class DevFakeWiFi {
    async init(app) {
    }


    addWebAPI(app) {
        this.addRoutes(app);
    }


    addRoutes(app) {
        app.get('/api/v1/wifi/scan', asyncHandler(async (req, res) => {
            let data = fake_scan_data;
            res.json(data);
        }));

        app.get('/api/v1/wifi/status', asyncHandler(async (req, res) => {
            let data;
            if (connected) {
                data = fake_status_connected_data;
            } else {
                data = fake_status_disconnected_data;
            }
            res.json(data);
        }));

        app.get('/api/v1/wifi/signal', asyncHandler(async (req, res) => {
            let data = {};
            res.json(data);
        }));

        app.post('/api/v1/wifi/connect', asyncHandler(async (req, res) => {
            log.log('connect', req.body);
            let data = {};
            connected = true;
            res.json(data);
        }));

        app.post('/api/v1/wifi/disconnect', asyncHandler(async (req, res) => {
            log.log('disconnect');
            let data = {};
            connected = false;
            res.json(data);
        }));
    }
}

module.exports = DevFakeWiFi;
