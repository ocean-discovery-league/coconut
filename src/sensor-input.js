'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const tail = require('tail');
const byline = require('byline');
const byclock = require('./byclock');
const sensors = require('./sensors');
const sensorLog = require('./sensor-log');

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


class SensorInput {
    async init() {
	this.sensors = {};
	this.sensorLog = new sensorLog();
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
	    this.readstream.on('error', (err) => log.error(`tail error on file ${filename}`, err));
	} else {
	    this.notail = true;
	    log.log('simulating using pre-recorded sensor data from', filename);
	    let first_monoclock = await this.sensorLog.extractFirstMonoclock(filename);
	    log.log('first monoclock in sensor data is', first_monoclock);
	    if (speedFactor && speedFactor !== 1.0) {
		log.log('speed factor is', speedFactor);
	    }
	    let filestream = fs.createReadStream(filename, 'utf8');
	    let lineStream = byline.createStream(filestream);
	    let clockStream = new byclock.ClockStream(first_monoclock, speedFactor);

	    this.readstream = lineStream.pipe(clockStream);
	    this.readstream.on('data', (line) => this.processLine(line));
	    this.readstream.on('error', (err) => log.error(`stream error on file ${filename}`, err));
	}
    }


    processLine(line) {
	this.count++;
	if (this.count % 1000 === 0) { log.log('.') };
	let [id, reading] = this.sensorLog.parseLine(line);
	this.monoclock = reading.monoclock;
	this.update(id, reading);

	// if (!this.lastupdate || (this.monoclock - this.lastupdate > (1e9 * 10))) {
	//     this.lastupdate = this.monoclock;
	//     log.log();
	//     // for (let id of Object.keys(this.sensors).sort()) {
	//     // 	log.log(`${id}  ${this.sensors[id].reading.values}`);
	//     // }
	// }

	if (id === 'GNSS') {
	    if (!this.lastupdate) {
		this.lastupdate = this.monoclock;
	    }
	    let elapsed_secs = this.elapsed_secs(this.lastupdate);
	    if (elapsed_secs > 1.5) {
		log.log(elapsed_secs.toFixed(2), 'missed');
	    } else {
		log.log(elapsed_secs.toFixed(2));
	    }
	    this.lastupdate = this.monoclock;
	}
	    
    }


    update(id, reading) {
	let sensor = this.sensors[id];
	if (!sensor) {
	    sensor = new sensors.Sensor(id);
	    this.sensors[id] = sensor;
	}
	sensor.update(reading);
    }


    elapsed_secs(start, end=this.monoclock) {
	end = end || this.monoclock;
	return (end - start) / 1e9;
    }
}


async function tests() {
    log = console;
    let sensorInput = new SensorInput();
    await sensorInput.init();

    //await sensorInput.start('../test/sampledata_fake.txt', true);
    //await sensorInput.start('../test/sampledata_bad.txt', true);
    //await sensorInput.start('../test/MKN0001_M1_2021_02_18_21_03_01.725.txt', true, 100.0);
    await sensorInput.start('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', true, 100.0);
}


if (require.main === module) {
    tests();
}
	

module.exports = SensorInput;
