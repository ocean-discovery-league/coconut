'use strict';

const { EventEmitter } = require('events');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1000000;
function in_ms(hrtime) {
    let [s, ns] = hrtime;
    return Math.floor((s * NS_PER_SEC + ns) / NS_PER_MS);
}


class PulseClock extends EventEmitter {
    constructor(interval) {
	super();
	this.interval = interval;
	this.setMaxListeners(50);
    }


    start() {
	if (this.start_hrtime) throw new Error('already started');
	this.start_hrtime = process.hrtime();
	this.last_pulse = this.start_hrtime;
	this.pulse_cycle = 0;
	this.heartbeat_cycle = Math.floor(1000 * 30 / this.interval) || 1;  // approx every 30 seconds
	this.running = true;

	console.log('pulse clock started');
	this.emit('start');
	this._pulse(true);
    }


    _pulse(first) {
	let elapsed_ms;
	this.next_pulse = undefined;
	if (first) {
	    this.pulse_cycle = 0;
	    elapsed_ms = 0;
	} else {
	    this.pulse_cycle++;
	    elapsed_ms = in_ms(process.hrtime(this.start_hrtime));
	}

	let calltime = process.hrtime();
	this.emit('pulse', this.pulse_cycle, elapsed_ms);
	let eventtime_ms = in_ms(process.hrtime(calltime));  // FIXME this appears misguided (events seem to be dispatched async)

	if (this.running) {
	    this.next_pulse =
		setTimeout(() => this._pulse(), this.interval);
	    // TODO we should calculate how many ms to the next pulse boundry and not just use the full interval
	}
	
	if (this.pulse_cycle % this.heartbeat_cycle === 0 && this.pulse_cycle > 0) {
	    //console.log(`heartbeat (${this.pulse_cycle} pulse event proccessing time ${eventtime_ms})`);
	    console.log(`heartbeat (cycle ${this.pulse_cycle})`);
	}
    }


    _stop_pulsing() {
	this.running = false;
	if (this.next_pulse) {
	    cancelTimeout(this.next_pulse);
	    this.next_pulse = undefined;
	}
	console.log('pulse clock stopped');
    }


    stop() {
	this._stop_pulsing();
	if (this.ended) throw new Error('already ended');
	this.emit('stop');
	this.emit('end');
    }


    pause() {
	if (this.ended) throw new Error('already ended');
	if (this.running) {
	    this._stop_pulsing();
	    this.emit('pause');
	}
    }


    continue() {
	if (this.ended) throw new Error('already ended');
	if (!this.running) {
	    this.running = true;
	    console.log('pulse clock running again');
	    this.emit('continue');
	    this.next_pulse =
		setTimeout(() => this._pulse(), this.interval);
	}
	// TODO we should calculate how much time has passed and trigger the next pulse if it's overdue
    }


    waitUntil(monoclock) {
	console.log('`', monoclock);
	return new Promise((resolve) => {
	    let elapsed_ms = in_ms(process.hrtime(this.start_hrtime));
	    if (elapsed_ms >= monoclock) {
		console.log('late, late, late');
		nextTick(resolve);
	    } else {
		let waitForIt = (cycle, elapsed_ms) => {
		    console.log('w', elapsed_ms);
		    if (elapsed_ms >= monoclock) {
			console.log('caught up!');
			resolve();
		    } else {
			console.log('checks wristwatch');
			this.once('pulse', waitForIt);
		    }
		}
		this.once('pulse', waitForIt);
	    }
	});
    }
}


function tests() {
    let pulseClock = new PulseClock(100);
    let cycles = 30;
    pulseClock.on('pulse', () => {
	cycles--;
	if (cycles % 10 === 0) {
	    console.log('ten!');
	}
	if (cycles === 13) {
	    console.log('let us pause for a bit...');
	    pulseClock.pause();
	    setTimeout(() => pulseClock.continue(), 3000);
	}
	if (cycles <= 0) {
	    pulseClock.stop();
	}
    });

    pulseClock.start();
}


if (require.main === module) {
    tests();
}
    

module.exports = PulseClock;
