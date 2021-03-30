'use strict';

const { EventEmitter } = require('events');
const PulseClock = require('./pulse-clock');
const RaspiMJPEG = require('./raspimjpeg');

const PULSE_CLOCK_INTERVAL_MS = 300;
const MINUTE_MS = 1000 * 60;

let log = console;


// global.window = {};
// require('../static/mission-programs.js');
// const missionPrograms = window.missionPrograms;


class MissionEngine extends EventEmitter {
    async init() {
	this.pulseClock = new PulseClock(PULSE_CLOCK_INTERVAL_MS);
	this.raspiMJPEG = new RaspiMJPEG();
	await this.raspiMJPEG.start();
    }


    start(program, sensors) {
	if (this.started) {
	    throw new Error('mission engine can only be started once');
	}
	this.started = true;
	this.program = program;
	this.sensors = sensors;
	this.pulseClock.on('pulse', (...args) => this.doCycle(...args));
	this.pulseClock.start();
    }


    async stop() {
	if (!this.pulseClock.ended) {
	    if (!this.pulseClock.running) {
		// pulse clock is paused which means we are waiting for a command to finish
		log.log('waiting for command to complete before stopping mission engine');
		await new Promise( (resolve) => this.on('commandcomplete', resolve) );
		log.log('command completed');
	    }
	    this.pulseClock.stop();
	}
	await this.raspiMJPEG.sendCommand('ca 0');
	await this.raspiMJPEG.sendCommand('tl 0');
	await this.raspiMJPEG.sendCommand('md 0');
    }


    async doCycle(cycle_num, elapsed) {
	if (!this.action_start) {
	    this.action_start = elapsed;
	}

	if (!this.last_minute || this.last_minute < Math.floor(elapsed / MINUTE_MS)) {
	    let minute = Math.floor(elapsed / MINUTE_MS);
	    if (minute && (minute % 5) === 0)
	    log.log('minute', minute);
	    this.last_minute = minute;
	}

	let new_state;
	let new_phase;
	let options;

	///
	/// Phase 0
	///
	if (this.inPhase === 0 || !this.inPhase) {
	    log.log('begin');
	    new_phase = 1;
	}


	///
	/// Phase -1 (end)
	///
	if (this.inPhase < 0) {
	    log.log('end');
	    new_state = '_END_MISSION';
	}


	///
	/// mission program
	///
	if (!new_phase && !new_state) {
	    let action_elapsed = elapsed - this.action_start;
	    [new_state, new_phase, options] = this.program(this.inPhase, cycle_num, elapsed, action_elapsed, this.sensors);
	    options = options || {};
	}
	
	if (new_phase && new_phase !== this.inPhase) {
	    log.log('phase changed to', new_phase);
	    this.action_start = undefined;
	    this.state = undefined;
	    //new_state = undefined;
	    this.inPhase = new_phase;
	    // should we rerun the cycle now to rerun the action logic? just call this.cycle() again?
	    // or do we allow for one clock cycle of undefined state?
	    // or maybe we process all phase level stuff, *then* process actions?
	} else if (new_state && new_state !== this.state) {
	    log.log('new state', new_state);
	    this.pulseClock.pause();
	    this.state = new_state;
	    try {
		switch (new_state) {
		case 'RECORD_VIDEO':
		    await this.raspiMJPEG.sendCommand('ru 1');
		    await this.raspiMJPEG.sendCommand('tl 0');
		    await this.raspiMJPEG.sendCommand('ca 1');
		    break;

		case 'PAUSE_VIDEO':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    break;

		case 'TIME_LAPSE':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    await this.raspiMJPEG.sendCommand('md 0');
		    await this.raspiMJPEG.sendCommand('tl '+options.cycle);
		    break;

		case 'STOP_CAMERA':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    await this.raspiMJPEG.sendCommand('tl 0');
		    await this.raspiMJPEG.sendCommand('md 0');
		    break;

		// programs should not set this state, they should set new_phase to -1 instead
		case '_END_MISSION':
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
	    } catch(err) {
		log.error(err);
	    }
	    this.emit('commandcomplete');
	    if (!this.pulseClock.ended) {
		this.pulseClock.continue();
	    }
	}
    }
}


async function tests() {
    log = console;
    const missions = require('../missions');
    let name = 'time-based';
    if (!(name in missions)) {
	throw new Error(`unknown mission name ${name}`);
    }

    let program = missions[name];
    let missionEngine = new MissionEngine();
    await missionEngine.init();
    log.log(`running mission ${name}`);
    await missionEngine.start(program, {});
}


if (require.main === module) {
    tests();
}
	

module.exports = MissionEngine;
