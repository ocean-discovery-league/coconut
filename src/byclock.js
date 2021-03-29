'use strict';

const stream = require('stream');
const SensorLog = require('./sensor-log.js');
const PulseClock = require('./pulse-clock.js');

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};

const NS_PER_MS = 1000000;


class ClockStream extends stream.Transform {
    constructor(monoclockStart, speedFactor) {
	super();
	this.monoclock = monoclockStart;
	this.speedFactor = speedFactor || 1.0;
	this.sensorLog = new SensorLog();
    }


    _transform(line, encoding, callback) {
	let next_monoclock = this.sensorLog.parseMonoclock(line);
	let delay_ms = 0;
	if (next_monoclock > this.monoclock) {
	    delay_ms = (next_monoclock - this.monoclock) / NS_PER_MS / this.speedFactor;
	}
	this.push(line);
	log.debug(`byclock stream waiting ${delay_ms}ms`);
	setTimeout(callback, delay_ms);
	this.monoclock = next_monoclock;
    }
}


async function tests() {
    log = console;
}


if (require.main === module) {
    tests();
}
	

module.exports = { ClockStream };
