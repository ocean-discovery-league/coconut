'use strict';

const { EventEmitter } = require('events');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1000000;
function in_ms(ns) {
    return Number(ns / BigInt(NS_PER_MS));
}

let log = console;


class PulseClock extends EventEmitter {
    constructor(interval) {
        super();
        this.interval = interval;
        this.setMaxListeners(50);
    }


    start() {
        if (this.start_monoclock) throw new Error('already started');
        this.start_monoclock = process.hrtime.bigint();
        this.pulse_cycle = 0;
        this.heartbeat_cycle = Math.floor(1000 * 30 / this.interval) || 1;  // approx every 30 seconds
        this.running = true;

        log.log('pulse clock started');
        this.emit('start');
        this._pulse(true);
    }


    _pulse(first) {
        let elapsed_ms;
        let monoclock;
        this.next_pulse = undefined;
        if (first) {
            this.pulse_cycle = 0;
            monoclock = BigInt(0);
            elapsed_ms = 0;
        } else {
            this.pulse_cycle++;
            monoclock = process.hrtime.bigint();
            elapsed_ms = in_ms(monoclock - this.start_monoclock);
        }

        this.emit('pulse', this.pulse_cycle, elapsed_ms, monoclock);

        if (this.running) {
            this.next_pulse = setTimeout(() => this._pulse(), this.interval);
            // TODO we should calculate how many ms to the next pulse boundry and not just use the full interval
        }
        
        if (this.pulse_cycle % this.heartbeat_cycle === 0 && this.pulse_cycle > 0) {
            log.log(`heartbeat (cycle ${this.pulse_cycle})`);
        }
    }


    _stop_pulsing() {
        this.running = false;
        if (this.next_pulse) {
            clearTimeout(this.next_pulse);
            this.next_pulse = undefined;
            log.log('pulse clock stopped');
        }
    }


    stop() {
        this._stop_pulsing();
        if (this.ended) throw new Error('already ended');
        this.emit('stop');
        this.emit('end');
        this.ended = true;
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
            log.log('pulse clock running again');
            this.emit('continue');
            this.next_pulse =
                setTimeout(() => this._pulse(), this.interval);
        }
        // TODO we should calculate how much time has passed and trigger the next pulse if it's overdue
    }
}


function tests() {
    log = console;
    let pulseClock = new PulseClock(100);
    let cycles = 30;
    pulseClock.on('pulse', () => {
        cycles--;
        if (cycles % 10 === 0) {
            log.log('ten!');
        }
        if (cycles === 13) {
            log.log('let us pause for a bit...');
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
