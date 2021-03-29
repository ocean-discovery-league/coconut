'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const tail = require('tail');
const byline = require('byline');
const byclock = require('./byclock');
const sensors = require('./sensors');
const sensorLog = require('./sensor-log');
const PulseClock = require('./pulse-clock.js');

const MEDIA_DIR = '/var/www/html/media';
const RING_STATUS_FILENAME = '/home/pi/git/maka-niu/code/log/status.txt';

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


class SensorInput {
    async init(options) {
	this.notail = options && options.notail;
	this.clock = options && options.clock;

	this.sensors = {};
	this.sensorLog = new sensorLog();
	this.count = 0;
	this.last_status = false;
	//fs.watch(RING_STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
	//this.getStatus(true);
    }


    async start(filename, speedFactor) {
	if (filename) {
	    this.notail = true;
	    log.log('using pre-recorded sensor data from', filename);
	    let first_monoclock = await this.sensorLog.extractFirstMonoclock(filename);
	    log.log('first monoclock in sensor data is', first_monoclock);
	    let filestream = fs.createReadStream(filename, 'utf8');
	    let lineStream = byline.createStream(filestream);
	    let clockStream = new byclock.ClockStream(first_monoclock, speedFactor);

	    let readstream = lineStream.pipe(clockStream);
	    readstream.on('data', (line) => this.processLine(line));
	    readstream.on('error', (err) => log.error(`stream error on file ${filename}`, err));
	} else {
	    if (this.last_status) {
		let [, modenum, filename] = this.last_status.split(/([^ ]+) (.*)/);
		if ([4, 5].includes(Number(modenum))) {
		    if (!filename.includes('/')) {
			filename = MEDIA_DIR + '/' + filename;
		    }
		} else {
		    throw new Error('ring not on mission 1 or mission 2');
		}
		let options = {
		    fromBeginning: true,
		    //logger: console,
		};
		let readstream = new tail.Tail(filename, options);
		readstream.on('line', (line) => this.processLine(line));
		readstream.on('error', (err) => log.error(`tail error on file ${filename}`, err));
	    }
	}
    }


    async onStatusChange(eventType, filename) {
	log.log('ring status file changed', eventType, filename);
	let status = await this.getStatus();
    }


    async getStatus(sync) {
	log.log('reading ring status...');
	let status;
	if (!sync) {
	    status = await fsP.readFile(RING_STATUS_FILENAME, 'utf8');
	} else {
	    status = fs.readFileSync(RING_STATUS_FILENAME, 'utf8');
	}
	log.log('ring status:', status);
	this.last_status = status;
	return status;
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
    sensorInput.init();
    //sensorInput.start('../test/sampledata_fake.txt');
    //sensorInput.start('../test/sampledata_bad.txt');
    //sensorInput.start('../test/sampledata_huge.txt', { notail: true });
    //sensorInput.start('../test/MKN0001_M1_2021_02_18_21_03_01.725.txt', { notail: true });
    //sensorInput.start('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', { notail: true });
    //await sensorInput.init();
    await sensorInput.start('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', 1);
}


if (require.main === module) {
    tests();
}
	

module.exports = SensorInput;
