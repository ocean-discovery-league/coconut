'use strict';

const os = require('os');
const fsP = require('fs').promises;
const child_process = require('child_process');
const asyncHandler = require('express-async-handler');
//const isOnline = require('is-online');
//const isTcpOn = require('is-tcp-on');
//const roslib = require('roslib');

const ROVER_INTERFACE = 'tun0';
const SERVER_TEST_ADDRESS = 'rover.irontech.org';
const SERVER_TEST_PORT = 80;
const DHCP_LEASES_FILE = '/var/lib/misc/dnsmasq.leases';
const SSH_TCP_PORT = 22;
const HAS_ROS = (os.arch() === 'x64');
const ROS_URL = 'ws://localhost:9090';
const ROS_CONNECT_TIMEOUT = 5 * 1000;

const log = console;

const timeoutP = function(ms) {
    return new Promise( (resolve) => setTimeout(resolve, ms) );
}


class Rover {
    async init(app, io, wifi, bluetooth) {
        this.wifi = wifi;
        this.bluetooth = bluetooth;
        this.addRoutes(app);
    }


    addRoutes(app) {
        app.get('/api/v1/rover/ping', (req, res) => {
            res.json({ ping: true });
        });

        app.post('/api/v1/rover/debug', asyncHandler(async (req, res) => {
            log.log('client debug', req.body);
            res.end();
        }));

        app.post('/api/v1/rover/reboot', asyncHandler(async (req, res) => {
            log.log('rebooting!');
            child_process.exec('reboot');
            res.json({ rebooting: true });
        }));

        app.get('/api/v1/rover/status', asyncHandler(async (req, res) => {
            let data = await this.getStatus();
            res.json(data);
        }));
    }


    async getStatus() {
        return new Promise((resolve, reject) => {
            if (this.status_pending && this.status_pending.length) {
                this.status_pending.push({resolve,reject});
                //log.log('queueing status request', this.status_pending.length);
            } else {
                //log.log('resolve2', resolve);
                this.status_pending = [{resolve,reject}];
                log.log('initiating status checks');
                this.doStatusChecks()
                    .then(status => {
                        log.log('status checks finished');
                        let promise;
                        while (promise = this.status_pending.shift()) {
                            //log.log('resolving status request');
                            promise.resolve(status);
                        }
                    })
                    .catch((error) => {
                        log.error('status checks threw an error', error);
                        let promise;
                        while (promise = this.status_pending.shift()) {
                            //log.log('rejecting status request');
                            promise.reject(error);
                        }
                    });
            }
        });
    }


    async doStatusChecks() {
        let data = {};
        data.wifi = await this.wifi.getStatus();
        let state = data.wifi.wpa_state;
        if (HAS_ROS) {
            data.ros = {};
            data.ros.connected = await this.doROSCheck();
        }
        data.uptime = os.uptime();
        data.hostname = os.hostname();
        if (state === 'COMPLETED') {
            data.ip_address = await this.determineIPAddress();
            data.rover_ip_address = await this.determineRoverIPAddress();
            data.dhcp_leases = await this.readDHCPLeases();
            // let jibo_ip = await this.isJiboConnected(data.dhcp_leases);
            // if (jibo_ip) {
            //     data.jibo_connected = true;
            //     data.jibo_ip_address = jibo_ip;
            // } else {
            //     data.jibo_connected = false;
            // }

            // //if (data.jibo_connected) {
            // data.internet_connected = await this.isInternetConnected();
            // if (data.internet_connected) {
            //     data.server_connected = await this.isServerConnected();
            // }
            // //}
        }

        return data;
    }


    async doROSCheck() {
        return new Promise((resolve) => {
            log.log('checking ROS...');
            let client = new roslib.Ros( { url: ROS_URL } );
            let timeout = setTimeout(() => {
                log.log('ROS connection timed out');
                timeout = null;
                client.close();
                resolve(false);
            }, ROS_CONNECT_TIMEOUT);
                
            client.on('connection', () => {
                log.log('ROS connected');
                if (timeout) {
                    clearTimeout(timeout);
                    resolve(true);
                }
            });

            client.on('error', (err) => {
                let code = err && err.error && err.error.code;
                log.error('ROS connection error', code);
                client.close();
                if (timeout) {
                    clearTimeout(timeout);
                    resolve(false);
                }
            });
        });
    }


    async determineIPAddress() {
        let interfaces = os.networkInterfaces();
        if (interfaces[INTERFACE]) {
            for (let address of interfaces[INTERFACE]) {
                if (address.family === 'IPv4') {
                    return address.address;
                }
            }
        }
        return undefined;
    }


    async determineRoverIPAddress() {
        let interfaces = os.networkInterfaces();
        if (interfaces[ROVER_INTERFACE]) {
            for (let address of interfaces[ROVER_INTERFACE]) {
                if (address.family === 'IPv4') {
                    return address.address;
                }
            }
        }
        return undefined;
    }


    async readDHCPLeases() {
        let file = await fsP.readFile(DHCP_LEASES_FILE, 'utf8');
        let lines = file.split('\n');
        let leases = [];
        // 1625727703 dc:f7:56:e1:c4:3e 10.99.0.8 Galaxy-Tab-A-2016 01:dc:f7:56:e1:c4:3e
        // 1625735625 f8:ff:c2:38:76:3c 10.99.0.4 Jons-MBP 01:f8:ff:c2:38:76:3c
        // 1625738341 f0:c7:7f:95:72:79 10.99.0.5 * 01:f0:c7:7f:95:72:79
        // 1625731234 52:01:13:1f:df:8e 10.99.0.13 JiboStation24 01:52:01:13:1f:df:8e
        for (let line of lines) {
            let lease = line.split(' ');
            //if (!lease) continue;
            //if (!lease[0]) continue;
            //lease[0] = new Date(Number(lease[0]) * 1000).toISOString().split('.')[0];
            leases.push(lease);
        }
        return leases;
    }


    async isJiboConnected(leases) {
        //await timeoutP(500);  // don't do it *too* quickly
        // just look for anything that has the ssh port open
        for (let lease of leases) {
            // 1625738341 f0:c7:7f:95:72:79 10.99.0.5 * 01:f0:c7:7f:95:72:79
            let ip = lease[2];
            if (ip) {
                let options = 
                    {
                        host: ip,
                        port: SSH_TCP_PORT,
                        timeout: 1000
                    };
                try {
                    await isTcpOn(options);
                    return ip;
                } catch {
                    // not that one
                }
            }
        }
        return false;
    }


    async isInternetConnected(giveittime) {
        let interval = 4 + 1000;
        if (giveittime) {
            interval = 12 * 1000;
        }
        let done = false;
        let timeout = setTimeout( () => { done = true; }, interval );
        while (!done) {
            if (await isOnline({timeout:2000})) {
                done = true;
                clearTimeout(timeout);
                return true
            }
            await timeoutP(500);
        }
        clearTimeout(timeout);
        return false;
    }


    async isServerConnected() {
        let options = 
        {
            host: SERVER_TEST_ADDRESS,
            port: SERVER_TEST_PORT,
            timeout: 5000 // optional, default is 1000ms
        };
        try {
            await isTcpOn(options);
            return true;
        } catch {
            return false;
        }
    }
}


module.exports = Rover;
