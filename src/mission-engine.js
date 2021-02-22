'use strict';

const MissionState = undefined;
const MissionEvents = undefined;
const MissionActions = undefined;
const PulseClock = require('./pulse-clock');

const PULSE_CLOCK_INTERVAL_MS = 100;
const MINUTE_MS = 100; // FIXME 1000 * 60


global.window = {};
require('../static/mission-programs.js');
const missionPrograms = window.missionPrograms;


class MissionEngine {
    async init() {
    }


    async loadProgram(name) {
	this.program_name = name;
	this.program = missionPrograms[name];
	if (!this.program) { throw new Error(`mission name ${name} not found`); }
	console.log(`loaded mission name ${this.program_name}`);
	console.log(this.program_name, this.program);
    }


    async handProgram() {
	this.program_name = 'byhand1a';
	this.inPhase = 0;
	this.phases = [];
	let phase = new Phase('1');
	let action = new Action();
    }

    
    start() {
	this.pulseClock = new PulseClock(PULSE_CLOCK_INTERVAL_MS);

	this.pulseClock.on('pulse', (...args) => this.doCycle(...args));
	this.pulseClock.start();
    }


    doCycle(cycle_num, elapsed) {
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
	if (this.inPhase === 0 || !this.inPhase) {
	    console.log('begin');
	    new_phase = 1;
	}
	if (this.inPhase < 0) {
	    console.log('end');
	    this.pulseClock.stop();
	}
	
	if (this.inPhase === 1) {
	    if (elapsed < (MINUTE_MS * 5)) {
		new_state = 'WAIT';
	    } else {
		new_phase = this.inPhase + 1;
	    }
	}
	if (this.inPhase === 2) {
	    let action_elapsed = elapsed - this.action_start;

	    if (action_elapsed < (MINUTE_MS * 5)) {
		new_state = 'RECORD_VIDEO';
	    } else if (action_elapsed < (MINUTE_MS * 20)) {
		new_state = 'PAUSE_VIDEO';
	    } else {
		new_state = 'ACTION_CLOCK_RESET';
	    }

	    if (elapsed > (MINUTE_MS * 50)) {
		new_phase = -1;
	    }
	}

	if (new_phase && new_phase !== this.inPhase) {
	    console.log('phase changed to', new_phase);
	    this.action_start = undefined;
	    this.state = undefined;
	    //new_state = undefined;
	    this.inPhase = new_phase;
	    // should we rerun the cycle noew to rerun the action logic? just call this.cycle() again?
	    // or do we allow for one clock cycle of undefined state?
	    // or maybe we process all phase level stuff, *then* process actions?
	} else if (new_state && new_state !== this.state) {
	    console.log('new state', new_state);
	    this.state = new_state;
	}


	if (this.state === 'ACTION_CLOCK_RESET') {  // this should probably not be a peer to actions
	    this.action_start = undefined;  // let the next cycle set it? or just set it here and now?
	    // reset the state to undefined now that we've done it?
	}
    }
}


class MissionCondition {
}


class MissionAction {
}


async function tests() {
    let missionEngine = new MissionEngine();
    missionEngine.start();
}


if (require.main === module) {
    tests();
}
	

module.exports = MissionEngine;
