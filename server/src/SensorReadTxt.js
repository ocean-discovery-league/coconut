'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const { EventEmitter } = require('events');
const tail = require('tail');
const byline = require('byline');
const byclock = require('./byclock.js');
const sensors = require('./sensors.js');
const SensorLog = require('./SensorLog.js');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1000000;
const MS_PER_SEC = 1000;

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


function elapsed_ms(start, end) {
    return Number((end - start) / BigInt(NS_PER_MS));
}


class SensorReadTxt extends EventEmitter {
    async init() {
        this.sensors = {};
        this.sensorLog = new SensorLog();
        this.count = 0;
    }


    async start(filename, simulated, speedFactor) {
        if (!filename) {
            throw new Error('filename required');
        }

        if (!simulated) {
            let options = {
                fromBeginning: true,
                //logger: console,
            };
            this.readstream = new tail.Tail(filename, options);
            this.readstream.on('line', (line) => this.processLine(line));
            this.readstream.on('close', () => this.emit('close'));  // never because of tail?
            this.readstream.on('error', (err) => log.error(`tail error on file ${filename}`, err));
        } else {
            this.notail = true;
            log.error('simulating using pre-recorded sensor data from', filename);
            let first_monoclock = await this.sensorLog.extractFirstMonoclock(filename);
            log.error('first monoclock in sensor data is', first_monoclock);
            if (speedFactor && speedFactor !== 1.0) {
                log.error('speed factor is', speedFactor);
            }
            this.filestream = fs.createReadStream(filename, 'utf8');
            this.lineStream = byline.createStream(this.filestream);
            this.clockStream = new byclock.ClockStream(first_monoclock, speedFactor);

            this.readstream = this.lineStream.pipe(this.clockStream);
            this.readstream.on('data', (line) => this.processLine(line));
            this.readstream.on('close', () => this.emit('close'));
            this.readstream.on('error', (err) => log.error(`stream error on file ${filename}`, err));
        }
    }


    stop() {
        if (this.readstream) {
            try {
                this.readstream.destroy();
            } catch {}
            delete this.readstream;
        }
        if (this.clockStream) {
            try {
                this.clockStream.destroy();
            } catch {}
            delete this.clockStream;
        }
        if (this.lineStream) {
            try {
                this.lineStream.destroy();
            } catch {}
            delete this.lineStream;
        }
    }


    processLine(line) {
        line = String(line);
        if (line && line.startsWith('DEID') || line.startsWith('MACA')) {
            return;
        }
        this.count++;
        if (this.count % 1000 === 0) { log.error('.'); };
        let [id, reading] = this.sensorLog.parseLine(line);
        this.monoclock = reading.monoclock;
        this.update(id, reading);
        this.emit('line', line);
    }


    update(id, reading) {
        let sensor = this.sensors[id];
        if (!sensor) {
            sensor = new sensors.Sensor(id);
            this.sensors[id] = sensor;
        }
        sensor.update(reading);
        this.emit('reading', { id, reading });
    }
}


async function tests() {
    log = console;
    let sensorReadTxt = new SensorReadTxt();
    await sensorReadTxt.init();

    //await sensorReadTxt.start('../test/sampledata_fake.txt', true);
    //await sensorReadTxt.start('../test/sampledata_bad.txt', true);
    //await sensorReadTxt.start('../test/MKN0001_M1_2021_02_18_21_03_01.725.txt', true, 100.0);
    await sensorReadTxt.start('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', true, 100.0);
}


if (require.main === module) {
    tests();
}


module.exports = SensorReadTxt;
