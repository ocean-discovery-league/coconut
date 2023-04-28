'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const asyncHandler = require('express-async-handler');
const { version } = require('../../package.json');

// const MEDIA_DIR = '/var/www/html';
// const MISSION_ID_FILE = MEDIA_DIR + '/mission_id.json';
const MISSION_ID_FILE = path.resolve(`${__dirname}/../../missions/mission-id.json`);
const INTERFACE = process.argv[2] || 'wlan1';  // node index.js <INTERFACE>
const ALT_INTERFACE = 'ap@wlan0';
const PYTHON_DAEMON_VERSION_FILE = '/home/pi/git/maka-niu/code/log/version.txt';


const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    warn: console.log,
    error: console.error,
};


class MissionID {
    async init(app) {
        if (app) {
            this.addRoutes(app);
        }
    }


    addRoutes(app) {
        app.get('/api/v1/missionid', asyncHandler(async (req, res) => {
            try {
                let missionid = await this.getMissionId();
                let json = JSON.stringify(missionid);
                res.setHeader('Content-Type', 'application/json');
                res.end(json);
            } catch(err) {
                log.error('get missionid error', err);
                res.status(500).send(err.message);
            }
        }));

        app.post('/api/v1/missionid', asyncHandler(async (req, res) => {
            try {
                log.log('connect', req.body);
                let saved = await this.saveMissionId(req.body.username, req.body.missionid);
                if (!saved) {
                    throw new Error('error saving missionid');
                }
                res.end();
            } catch(err) {
                res.status(500).send(err.message);
            }
        }));
    }


    async getMissionId() {
        let data = {};
        try {
            let json = await fsP.readFile(MISSION_ID_FILE);
            data = JSON.parse(json);
        } catch(err) {
            if (err.code === 'ENOENT') {
                log.log(`no mission file ${MISSION_ID_FILE}`);
            } else {
                log.error(`error getting mission id file ${MISSION_ID_FILE}`, err);
            }
        }
        data.hostname = os.hostname();
        data.macaddress = await this.determineMACAddress();
        let python_version = await this.getPythonDaemonVersion();
        if (python_version) {
            data.python_version = python_version;
        }
        log.log('mac', data.macaddress);
        data.version = version;
        log.log('version', version);
        return data;
    }


    async getPythonDaemonVersion() {
        let python_version;
        try {
            python_version = await fsP.readFile(PYTHON_DAEMON_VERSION_FILE);
            python_version = python_version.toString();
            python_version = python_version.trim();
        } catch(err) {
            if (err.code === 'ENOENT') {
                log.log(`no python daemon version file ${PYTHON_DAEMON_VERSION_FILE}`);
            } else {
                log.error(`error reading python daemon version file ${PYTHON_DAEMON_VERSION_FILE}`, err);
            }
        }
        log.log('python daemon version', python_version);
        return python_version;
    }


    async saveMissionId(username, missionid) {
        let success = false;
        try {
            let lastchanged = (new Date(Date.now())).toISOString();
            let data = {username, missionid, lastchanged};
            let json = JSON.stringify(data);
            log.log('missionid json', json);
            await fsP.writeFile(MISSION_ID_FILE, json, 'utf8');
            success = true;
        } catch(err) {
            log.error(`error saving mission id file ${MISSION_ID_FILE}`, err);
        }
        return success;
    }


    async writeMissionIdMarkerFile(sensor_log_filename) {
        // write a parallel file based on the sensor log file name that
        // just contains the mission id info
        let success = false;
        let filename;
        try {
            filename = sensor_log_filename + '.id.txt';
            log.log('filename', filename);
            let data = await this.getMissionId();
            data.missionstarted = (new Date(Date.now())).toISOString();
            let json = JSON.stringify(data);
            log.log('missionid marker file json', json);
            await fsP.writeFile(filename, json, 'utf8');
            success = true;
        } catch(err) {
            log.error(`error saving mission id marker file ${filename}`, err);
        }
        return success;
    }


    async determineMACAddress() {
        let interfaces = os.networkInterfaces();
        if (interfaces[INTERFACE]) {
            for (let address of interfaces[INTERFACE]) {
                if (address.family === 'IPv4') {
                    return address.mac;
                }
            }
        } else if (interfaces[ALT_INTERFACE]) {
            for (let address of interfaces[ALT_INTERFACE]) {
                if (address.family === 'IPv4') {
                    return address.mac;
                }
            }
        }
        return undefined;
    }
}


async function tests() {
    Object.assign(log, console);
    let missionID = new MissionID();
}


if (require.main === module) {
    tests();
}


module.exports = MissionID;
