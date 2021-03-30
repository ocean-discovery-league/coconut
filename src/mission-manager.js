'use strict';

const RingInput = require('./ring-input.js');
const SensorInput = require('./sensor-input');
const MissionEngine = require('./mission-engine');
const missions = require('../missions');

let log = console;


class MissionManager {
    async init() {
	this.ringInput = new RingInput();
	await this.ringInput.init();
    }


    async start(programName, filename, speedFactor) {
	if (!programName) {
	    this.ringInput.on('change', () => this.ringChangeHandler());
	    filename = this.ringInput.getSensorLogFilename();
	    if (filename) {  // we should already be running
		this.beginMission();
	    }
	} else {
	    this.beginMission(programName, filename, speedFactor);
	}
    }

    async ringChangeHandler() {
	let [new_modenum, new_filename] = this.ringInput.parseStatus();
	if ((new_modenum !== this.modenum) || (new_filename !== this.filename)) {
	    this.stopMission();
	}
	if (new_filename) {
	    this.beginMission();
	}
    }


    async beginMission(programName, filename, speedFactor) {
	if (!programName) {
	    let modenum = this.ringInput.getModenum();
	    let filename = this.ringInput.getSensorLogFilename();
	    if (filename) {
		this.filename = filename;
		this.modenum = modenum;
		this.sensorInput = new SensorInput();
		await this.sensorInput.init();
		await this.sensorInput.start(this.filename);

		let name = `ring${this.modenum}`;
		let program = missions[name];
		if (!program) {
		    await this.stopMission();
		    throw new Error('mission ${name} not found!');
		}
		this.missionEngine = new MissionEngine();
		await this.missionEngine.init();
		await this.missionEngine.start(program, this.sensorInput.sensors);
	    } else {
		log.error('no sensor filename specified, not beginning mission');
	    }
	} else {
	    this.filename = filename;
	    this.sensorInput = new SensorInput();
	    await this.sensorInput.init();
	    await this.sensorInput.start(this.filename, true, speedFactor);
	    let program = missions[programName];
	    if (!program) {
		await this.stopMission();
		throw new Error('mission ${programName} not found!');
	    }
	    this.missionEngine = new MissionEngine();
	    await this.missionEngine.init();
	    await this.missionEngine.start(program, this.sensorInput.sensors);
	}
    }


    async stopMission() {
	if (this.missionEngine) {
	    log.log('stopping current mission');
	    await this.missionEngine.stop()
	    delete this.missionEngine;
	}
	if (this.sensorInput) {
	    this.sensorInput.stop();
	    delete this.sensorInput;
	}
	delete this.filename;
	delete this.modenum;
    }
}
    

async function tests() {
    log = console;
    let name = process.argv[2] || 'mission1';
    let filename = '../test/MKN0002_M1_2021_02_22_17_03_57.423.txt';
    if (name in missions) {
	//let program = missions[name];
	let missionManager = new MissionManager();
	await missionManager.init();
	await missionManager.start(name, filename, 10.0);
    } else {
	log.error(`unknown mission name ${name}`);
	log.error(`available missions: ${Object.keys(preprogrammedMissions).sort().join(' ')}`);
    }
}


if (require.main === module) {
    tests();
}
	

module.exports = MissionManager;
