'use strict';

const PulseClock = require('./pulse-clock');
const RaspiMJPEG = require('./raspimjpeg');
//const SensorInput = require('./sensor-input');
const missions = require('../missions');

const PULSE_CLOCK_INTERVAL_MS = 100;
const MINUTE_MS = 1000; // FIXME 1000 * 60


// global.window = {};
// require('../static/mission-programs.js');
// const missionPrograms = window.missionPrograms;


class MissionEngine {
    async init() {
	this.raspiMJPEG = new RaspiMJPEG();
	await this.raspiMJPEG.start();
    }


    // async loadProgramByName(name) {
    // 	this.program_name = name;
    // 	this.program = missionPrograms[name];
    // 	if (!this.program) { throw new Error(`mission name ${name} not found`); }
    // 	console.log(`loaded mission name ${this.program_name}`);
    // 	console.log(this.program_name, this.program);
    // }


    async loadProgram(missionProgram) {
	this.program = missionProgram;
    }


    // async handProgram() {
    // 	this.program_name = 'byhand1a';
    // 	this.inPhase = 0;
    // 	this.phases = [];
    // 	let phase = new Phase('1');
    // 	let action = new Action();
    // }

    
    start() {
	this.pulseClock = new PulseClock(PULSE_CLOCK_INTERVAL_MS);
	this.pulseClock.on('pulse', (...args) => this.doCycle(...args));
	this.pulseClock.start();
    }


    async doCycle(cycle_num, elapsed) {
	if (!this.action_start) {
	    this.action_start = elapsed;
	}

	if (!this.last_minute || this.last_minute < Math.floor(elapsed / MINUTE_MS)) {
	    let minute = Math.floor(elapsed / MINUTE_MS);
	    if (minute && (minute % 5) === 0)
	    console.log('minute', minute);
	    this.last_minute = minute;
	}

	let new_state;
	let new_phase;

	///
	/// Phase 0
	///
	if (this.inPhase === 0 || !this.inPhase) {
	    console.log('begin');
	    new_phase = 1;
	}


	///
	/// Phase -1 (end)
	///
	if (this.inPhase < 0) {
	    console.log('end');
	    new_state = 'END_MISSION';
	}


	///
	/// mission program
	///
	if (!new_phase && !new_state) {
	    let action_elapsed = elapsed - this.action_start;
	    [new_state, new_phase] = this.program(this.inPhase, cycle_num, elapsed, action_elapsed);
	}
	
	if (new_phase && new_phase !== this.inPhase) {
	    console.log('phase changed to', new_phase);
	    this.action_start = undefined;
	    this.state = undefined;
	    //new_state = undefined;
	    this.inPhase = new_phase;
	    // should we rerun the cycle now to rerun the action logic? just call this.cycle() again?
	    // or do we allow for one clock cycle of undefined state?
	    // or maybe we process all phase level stuff, *then* process actions?
	} else if (new_state && new_state !== this.state) {
	    console.log('new state', new_state);
	    this.state = new_state;
	    switch (new_state) {
	    case 'RECORD_VIDEO':
		await this.raspiMJPEG.sendCommand('ru 1');
		await this.raspiMJPEG.sendCommand('ca 1');
		break;

	    case 'PAUSE_VIDEO':
		await this.raspiMJPEG.sendCommand('ca 0');
		break;

	    case 'END_MISSION':
		this.pulseClock.stop();
		await this.raspiMJPEG.sendCommand('ca 0');
		await this.raspiMJPEG.sendCommand('tl 0');
		await this.raspiMJPEG.sendCommand('md 0');
		break;

	    case 'ACTION_CLOCK_RESET':  // this should probably not be a peer to actions
		this.action_start = undefined;  // let the next cycle set it? or just set it here and now?
		// reset the state to undefined now that we've done it?
		break;
	    }		
	}
    }
}


async function tests() {
    let name = process.argv[2] || 'mission1';
    if (name in missions) {
	let missionProgram = missions[name];
	let missionEngine = new MissionEngine();
	await missionEngine.init();
	missionEngine.loadProgram(missionProgram);
	console.log(`loaded mission ${name}`);
	await missionEngine.start();
    } else {
	console.error(`unknown mission name ${name}`);
	console.error(`available missions: ${Object.keys(preprogrammedMissions).sort().join(' ')}`);
    }
}


if (require.main === module) {
    tests();
}
	

module.exports = MissionEngine;
