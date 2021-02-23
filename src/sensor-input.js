'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const tail = require('tail');
const byline = require('byline');
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
    async init(filename, options) {
	this.filename = filename;
	this.notail = options && options.notail;
	this.clock = options && options.clock;

	this.sensors = {};
	this.count = 0;
	this.last_status = false;
	fs.watch(RING_STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
	this.getStatus(true);
    }


    async start() {
	if (this.filename) {
	    this.notail = true;
	    console.log('using pre-recorded sensor data');
	    this.clock = new PulseClock(100);
	    this.speed_factor = 1000;
	    if (!this.filename.includes('/')) {
		this.filename = MEDIA_DIR + '/' + this.filename;
	    }
	    let stream = fs.createReadStream(this.filename, 'utf8');
	    let a_byline = byline.createStream(stream);
	    let firstline = await new Promise((resolve) => {
		a_byline.once('data', (data) => resolve(data));
	    });
	    stream.destroy();
	    this.first_monoclock = this.getMonoclock(firstline);
	    console.log('first monoclock in sensor data is', this.first_monoclock);
	} else {
	    if (this.last_status) {
		let [, modenum, filename] = this.last_status.split(/([^ ]+) (.*)/);
		if ([4, 5].includes(Number(modenum))) {
		    this.filename = filename;
		} else {
		    throw new Error('ring not on mission 1 or mission 2');
		}
	    }
	}
	if (!this.filename.includes('/')) {
	    this.filename = MEDIA_DIR + '/' + this.filename;
	}
	if (this.notail) {
	    let stream = fs.createReadStream(this.filename, 'utf8');
	    this.byline = byline.createStream(stream);
	    if (!this.clock) {
		this.byline.on('data', (data) => this.line(data));
	    } else {
		this.byline.on('data', (data) => this.lineByClock(data));
	    }
	    this.byline.on('error', (err) => log.error(`byline error on file ${this.filename}`, err));
	} else {
	    let options = {
		fromBeginning: true,
		//logger: console,
	    };
	    this.tail = new tail.Tail(this.filename, options);
	    this.tail.on('line', (data) => this.line(data));
	    this.tail.on('error', (err) => log.error(`tail error on file ${this.filename}`, err));
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


    getMonoclock(data) {
	let [, id, info] = data.split(/([^:]+):(.*)/);
	let [monoclock, date, time, ...values] = info.split('\t');
	if (!monoclock) {
	    log.error(`could not parse sensor data line: ${data}`);
	}
	return monoclock;
    }


    async lineByClock(data) {
	let monoclock = this.getMonoclock(data);
	this.byline.pause();
	await this.clock.waitUntil((monoclock - this.first_monoclock) / this.speed_factor);
	this.byline.resume();
	this.line(data);
    }


    line(data) {
	this.count++;
	//if (this.count % 1000 === 0) { log.log('.') };
	let [, id, info] = data.split(/([^:]+):(.*)/);
	let [monoclock, date, time, ...values] = info.split('\t');
	if (!id || !monoclock || !date || !time) {
	    log.error(`could not parse sensor data line: ${data}`);
	    return;
	}
	log.log(id, values);
	let reading = new Reading(monoclock, date, time, values);
	this.monoclock = monoclock;
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
	    sensor = new Sensor(id);
	    this.sensors[id] = sensor;
	}
	sensor.update(reading);
    }


    elapsed_secs(start, end=this.monoclock) {
	end = end || this.monoclock;
	return (end - start) / 1e9;
    }
}


class Reading {
    constructor(monoclock, date, time, values) {
	this.monoclock = monoclock;
	this.date = date;
	this.time = time;
	this.values = values;
    }
}
    

class Sensor {
    constructor(id, nosubclass) {
	if (id in sensorSubClasses && !nosubclass) {
	    return new sensorSubClasses[id](id);
	} else {
	    this.id = id;
	    this.reading_count = 0;
	    this.history = [];
	    this.history_limit = 10;
	    return this;
	}
    }


    update(reading) {
	this.reading = reading;
	this.reading_count++;
	this.history.unshift(this.reading);  // history[0] is also the current reading
	this.history.length = Math.min(this.history.length, this.history_limit);
    }
}


class SensorKELL extends Sensor {
    constructor(id) {
	super(id, true);
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 3) {
	    log.error('KELL readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//log.log('update KELL');
    }
}
	

class SensorGNSS extends Sensor {
    constructor(id) {
	super(id, true);
	this.history_limit = 40;  // we want at least 30 seconds worth
	this.last_signal_locked_state = false;
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 2) {
	    log.error('GNSS readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//log.log('update GNSS');
    }


    islocked(currentclock) {
	// Check the history and decide if we think we have a lock or
	// not. When there is no successful GPS read the GNSS line is
	// skipped in the sensor log file.

	// We transition into signal locked state if we have >10 reads
	// in the last 30 seconds. Unlocked state is 0 reads in 30
	// seconds.  The transitions are separated to keep from
	// flapping in edge conditions

	// count how many GPS reads have succeeded in the last 30 seconds
	let reads = 0;
	for (let reading of this.history) {
	    if (this.elapsed_secs(currentclock, reading.monoclock) > 30) {
		break;
	    }
	    reads++;
	}

	let new_state;
	if (this.last_signal_locked_state === false) {
	    if (reads >= 10) {
		new_state = true;
	    } else {
		new_state = false;
	    }
	} else {
	    if (reads === 0) {
		new_state = false;
	    } else {
		new_state = true;
	    }
	}
	this.last_signal_locked_state = new_state;
	return new_state;
    }
}
	

class SensorBATT extends Sensor {
    constructor(id) {
	super(id, true);
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 1) {
	    log.error('BATT readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//log.log('update BATT');
    }
}


class SensorIMUN extends Sensor {
    constructor(id) {
	super(id, true);
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 10) {
	    log.error('IMUN readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//log.log('update IMUN');
    }
}
	

let sensorSubClasses = {
    'KELL': SensorKELL,
    'GNSS': SensorGNSS,
    'BATT': SensorBATT,
    'IMUN': SensorIMUN,
};


async function tests() {
    let log = console;
    let sensorInput = new SensorInput();
    //sensorInput.init('../test/sampledata_fake.txt');
    //sensorInput.init('../test/sampledata_bad.txt');
    //sensorInput.init('../test/sampledata_huge.txt', { notail: true });
    //sensorInput.init('../test/MKN0001_M1_2021_02_18_21_03_01.725.txt', { notail: true });
    //sensorInput.init('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', { notail: true });
    await sensorInput.init();
    //sensorInput.init('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt');
    await sensorInput.start();
}


if (require.main === module) {
    tests();
}
	

module.exports = SensorInput;
