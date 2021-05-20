'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');

const MEDIA_DIR = '/var/www/html/media';
const MISSION_ID_FILE = MEDIA_DIR + '/mission_id.json';

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
		let missionid = await this.getMissionID();
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
                let saved = await this.saveMissionID(req.body.username, req.body.missionid);
		if (!saved) {
		    throw new Error('error saving missionid');
		}
		res.end();
            } catch(err) {
                res.status(500).send(err.message);
            }
	});
    }
    

    async getMissionID() {
	let data = {};
	try {
	    let json = await fsP.readFile(MISSION_ID_FILE);
	    data = JSON.parse(json);
	} catch(err) {
	    console.error(`error getting mission id file ${MISSION_ID_FILE}`, err);
	}
	return data;
    }


    async saveMissionID(username, missionid) {
	let success = false;
	try {
	    let lastchanged = (new Date(Date.now())).toISOString();
	    let data = {username, missionid, lastchanged};
	    let json = JSON.stringify(data);
	    console.log('missionid json', json);
	    await fsP.writeFile(MISSION_ID_FILE, json, 'utf8');
	    success = true;
	} catch(err) {
	    console.error(`error saving mission id file ${MISSION_ID_FILE}`, err);
	}
	return success;
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
