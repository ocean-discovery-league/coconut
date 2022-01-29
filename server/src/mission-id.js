'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');

const MEDIA_DIR = '/var/www/html';
const MISSION_ID_FILE = MEDIA_DIR + '/mission_id.json';
const INTERFACE = process.argv[2] || 'wlan1';  // node index.js <INTERFACE>

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error,
};


class MissionID {
    async init(app) {
	this.app = app;
	if (app) {
	    this.addRoutes(app);
	}
    }


    addRoutes(app) {
	app.get('/missionid', async (req, res) => {
	    try {
		let missionid = await this.getMissionId();
		let json = JSON.stringify(missionid);
		res.setHeader('Content-Type', 'application/json');
		res.end(json);
	    } catch(err) {
		log.error('get missionid error', err);
		res.status(500).send(err.message);
	    }
	});

	app.post('/missionid', async (req, res) => {
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
	});
    }
    

    async getMissionId() {
	let data = {};
	try {
	    let json = await fsP.readFile(MISSION_ID_FILE);
	    data = JSON.parse(json);
	    data.hostname = os.hostname();
	    data.macaddress = await this.determineMACAddress();
	    log.log('mac', data.macaddress);
	} catch(err) {
	    if (err.code === 'ENOENT') {
		log.log(`no mission file ${MISSION_ID_FILE}`);
	    } else {
		log.error(`error getting mission id file ${MISSION_ID_FILE}`, err);
	    }
	}
	return data;
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
