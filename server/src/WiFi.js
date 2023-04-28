'use strict';

const os = require('os');
const fsP = require('fs').promises;
const child_process = require('child_process');
const asyncHandler = require('express-async-handler');
require('express-async-error');
const { Wireless, Monitor } = require('wirelesser');

const INTERFACE = process.argv[2];  // node index.js <INTERFACE>
if (!INTERFACE) {
    console.error(process.argv[1], 'Error: must specify interface as first argument');
    process.exit();
}
//const USE_NM = (os.arch() === 'x64');  // assuming x86 = Ubuntu, otherwise Rasbian
const USE_NM = false;  // dear god, i hope we are rid of NetworkManager -jon
const SCAN_COOLING_OFF_PERIOD = 1 * 1000;  // scan fails sometimes, maybe this will help (nope on pi! nuc?)

const log = console;


class WiFi {
    async init(app) {
        this.wireless = new Wireless(INTERFACE);
        //this.monitor = new Monitor(INTERFACE);
        //this.monitor.on('data', data => {
        //    log.log('data', data);
        //});
        //this.monitor.on('control', (control, args) => {
        //    log.log('control', control, args);
        //});

        this.addRoutes(app);
    }


    addRoutes(app) {
        app.get('/api/v1/wifi/scan', async (req, res) => {
            let json = '{}';
            try {
                let data = await this.getScan();
                json = JSON.stringify(data);
            } catch(err) {
                log.error(err);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        });

        app.get('/api/v1/wifi/signal', async (req, res) => {
            let json = '{}';
            try {
                let data = await this.wireless.exec('signal_poll');
                json = JSON.stringify(data);
            } catch(err) {
                log.error(err);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        });

        app.post('/api/v1/wifi/connect', async (req, res) => {
            let json = '{}';
            try {
                log.log('connect', req.body);
                let data = await this.connectToWiFi(req.body.ssid, req.body.password);
                json = JSON.stringify(data);
                log.log('result', data);
            } catch(err) {
                log.error(err);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        });

        app.post('/api/v1/wifi/disconnect', async (req, res) => {
            let json = '{}';
            try {
                log.log('disconnect');
                let data = await this.disconnectWiFi();
                json = JSON.stringify(data);
                log.log('result', data);
            } catch(err) {
                log.error(err);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        });
    }


    getScan() {
        return new Promise((resolve, reject) => {
            if (this.scan_pending && this.scan_pending.length) {
                this.scan_pending.push({resolve,reject});
                //console.log('queueing scan request', this.scan_pending.length);
            } else {
                this.scan_pending = [{resolve,reject}];
                console.log('scan cooling off period');
                setTimeout( () => {
                    console.log('initiating scan');
                    this.wireless.scan()
                        .then(scan => {
                            console.log('scan finished');
                            let actions;
                            while (actions = this.scan_pending.shift()) {
                                //console.log('resolving scan request');
                                actions.resolve(scan);
                            }
                        })
                        .catch((error) => {
                            console.error('scan threw an error', error);
                            let actions;
                            while (actions = this.scan_pending.shift()) {
                                //console.log('rejecting scan request');
                                actions.reject(error);
                            }
                        });
                }, SCAN_COOLING_OFF_PERIOD);
            }
        });
    }


    async getStatus() {
        let data = await this.wireless.status();
        let state = data.wpa_state;
        return data;
    }


    async connectToWiFi(ssid, password) {
        if (USE_NM) {
            let result = await nmcli.connect(ssid, password);
            log.log('result', result);
        } else {
            //await this.disableAll();
            await this.wireless.connect(ssid, password);
            await this.wireless.saveConfiguration();
        }
    }


    async disconnectWiFi() {
        if (USE_NM) {
            let result = await nmcli.disconnect();
            log.log('result', result);
        } else {
            //await this.disableAll();
            await this.wireless.disconnect();
            await this.wireless.saveConfiguration();
        }
    }


    async disableAll() {
        if (USE_NM) {
            // FIXME only if we ever go back to using NM again
        } else {
            let networks = await this.wireless.listNetworks();
            for (let network of networks) {
                if (!network.ssid) {
                    console.log(`removing network without ssid ${network.id}`);
                    await this.wireless.removeNetwork(network.id);
                } else {
                    console.log(`disabling network ${network.id}`);
                    await this.wireless.disableNetwork(network.id);
                }
            }
        }
    }
}

module.exports = WiFi;
