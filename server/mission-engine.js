'use strict';

const { EventEmitter } = require('events');
const PulseClock = require('./pulse-clock.js');
const RaspiMJPEG = require('./raspimjpeg.js');

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


    start(mission, sensors) {
	if (this.started) {
	    throw new Error('mission engine can only be started once');
	}
	this.started = true;
	this.mission = mission;
	this.sensors = sensors;
	this.last_gps_state = null;
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


    async doCycle(cycle_num, elapsed, monoclock) {
	if (!this.action_start) {
	    this.action_start = elapsed;
	}

	let new_action;
	let new_phase;
	let options;

	///
	/// Phase 0
	///
	if (this.current_phase === 0 || !this.current_phase) {
	    log.log('begin mission program', this.mission.program.name);
	    new_phase = 1;
	}


	///
	/// Phase -1 (end)
	///
	if (this.current_phase < 0) {
	    log.log('end mission program', this.mission.program.name);
	    new_action = '_END_MISSION';
	}


	///
	/// report some things of interest
	///

	// log the number of minutes every 5 minutes
	if (!this.last_minute || this.last_minute < Math.floor(elapsed / MINUTE_MS)) {
	    let minute = Math.floor(elapsed / MINUTE_MS);
	    if (minute && (minute % 5) === 0)
	    log.info('minute', minute);
	    this.last_minute = minute;
	}

	// log any changes in the GPS signal state as reported and smmothed out by getIsLocked()
	let gps_state = undefined;
	if (this.sensors && this.sensors.GNSS) {
	    gps_state = this.sensors.GNSS.getIsLocked(monoclock);
	}
	if (gps_state !== this.last_gps_state) {
	    if (gps_state === true) {
		log.info('GPS signal is locked');
	    } else if (gps_state === false) {
		log.info('GPS signal lost');
	    } else {
		log.debug('GPS signal is undefined');
	    }
	    this.last_gps_state = gps_state;
	}


	///
	/// mission program
	///
	if (!new_phase && !new_action) {
	    let action_elapsed = elapsed - this.action_start;
	    [new_action, new_phase, options] = this.mission.program(this.current_phase, cycle_num, elapsed, action_elapsed, monoclock, this.sensors);
	    options = options || {};
	}
	
	if (new_phase && new_phase !== this.current_phase) {
	    log.log('phase changed to', new_phase);
	    this.action_start = undefined;
	    this.current_action = undefined;
	    //new_action = undefined;
	    this.current_phase = new_phase;
	    // should we rerun the cycle now to rerun the action logic? just call this.cycle() again?
	    // or do we allow for one clock cycle of undefined action?
	    // or maybe we process all phase level stuff, *then* process actions?
	} else if (new_action && new_action !== this.current_action) {
	    log.log('new action', new_action);
	    this.pulseClock.pause();
	    this.current_action = new_action;
	    try {
		switch (new_action) {
		case 'WAIT':
		    break;

		case 'RECORD_VIDEO':
		    await this.raspiMJPEG.setFilenameAnnotation();
		    await this.raspiMJPEG.sendCommand('ru 1');
		    await this.raspiMJPEG.sendCommand('tl 0');
		    await this.raspiMJPEG.sendCommand('ca 1');
		    break;

		case 'PAUSE_VIDEO':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    break;

		case 'PAUSE_AND_BOX_VIDEO':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    //await this.raspiMJPEG.sendCommand('sy boxh264.sh box');
		    this.raspiMJPEG.sendCommand('sy boxh264.sh box');  // i don't think we want to await this
		    break;

		case 'TIME_LAPSE':
		    await this.raspiMJPEG.setFilenameAnnotation();
		    await this.raspiMJPEG.sendCommand('ca 0');
		    await this.raspiMJPEG.sendCommand('md 0');
		    await this.raspiMJPEG.sendCommand('tv '+options.cycle);
		    await this.raspiMJPEG.sendCommand('tl 1');
		    break;

		case 'STOP_CAMERA':
		    await this.raspiMJPEG.sendCommand('ca 0');
		    await this.raspiMJPEG.sendCommand('tl 0');
		    await this.raspiMJPEG.sendCommand('md 0');
		    break;

		// missions should not set this action, they should set new_phase to -1 instead
		case '_END_MISSION':
		    this.pulseClock.stop();
		    await this.raspiMJPEG.sendCommand('ca 0');
		    await this.raspiMJPEG.sendCommand('tl 0');
		    await this.raspiMJPEG.sendCommand('md 0');
		    this.raspiMJPEG.sendCommand('sy boxh264.sh box');  // i don't think we want to await this
		    break;

		case 'ACTION_CLOCK_RESET':  // this should probably not be a peer to actions
		    this.action_start = undefined;  // let the next cycle set it? or just set it here and now?
		    // reset the action to undefined now that we've done it?
		    break;

		default:
		    log.error('error: undefined action name', new_action);
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
    let name = 'mission1';
    if (!(name in missions)) {
	throw new Error(`unknown mission name ${name}`);
    }

    let mission = missions[name];
    let missionEngine = new MissionEngine();
    await missionEngine.init();
    log.log(`running mission ${name}`);
    await missionEngine.start(mission, {});
}


if (require.main === module) {
    tests();
}
	

module.exports = MissionEngine;
