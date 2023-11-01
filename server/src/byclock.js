'use strict';

const stream = require('stream');
const SensorLog = require('./SensorLog.js');
const PulseClock = require('./PulseClock.js');

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
            delay_ms = Number(next_monoclock - this.monoclock) / NS_PER_MS / this.speedFactor;
        }
        this.push(line);
        log.debug(`byclock stream waiting ${delay_ms}ms`);
        setTimeout(callback, delay_ms);
        this.monoclock = next_monoclock;
    }
}


async function tests() {
    log = console;

    const fs = require('fs');
    const byline = require('byline');

    let filename = '../test/MKN0002_M1_2021_02_22_17_03_57.423.txt';
    let sensorLog = new SensorLog();
    let first_monoclock = await sensorLog.extractFirstMonoclock(filename);
    log.log('first monoclock in sensor data is', first_monoclock);
    let filestream = fs.createReadStream(filename, 'utf8');
    let lineStream = byline.createStream(filestream);
    let clockStream = new ClockStream(first_monoclock, 10.0);

    let readstream = lineStream.pipe(clockStream);
    readstream.on('data', (line) => log.log(line.toString()));
    readstream.on('error', (err) => log.error(`stream error on file ${filename}`, err));
}


if (require.main === module) {
    tests();
}


module.exports = { ClockStream };
