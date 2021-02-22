'use strict';

const fs = require('fs');
const tail = require('tail');
const byline = require('byline');


class SensorInput {
    init(filename, options) {
	this.filename = filename;
	this.sensors = {};
	this.count = 0;
	this.notail = options && options.notail;
    }


    start() {
	if (this.notail) {
	    let stream = fs.createReadStream(this.filename, 'utf8');
	    this.byline = byline.createStream(stream);
	    this.byline.on('data', (data) => this.line(data));
	    this.byline.on('error', (err) => console.error(`byline error on file ${this.filename}`, err));
	} else {
	    this.tail = new tail.Tail(this.filename, {fromBeginning: true, follow: false, flushAtEOF: true, logger: console});
	    this.tail.on('line', (data) => this.line(data));
	    this.tail.on('error', (err) => console.error(`tail error on file ${this.filename}`, err));
	}
    }


    line(data) {
	this.count++;
	if (this.count % 1000 === 0) { console.log('.') };
	let [, id, info] = data.split(/([^:]+):(.*)/);
	let [monoclock, date, time, ...values] = info.split('\t');
	if (!id || !monoclock || !date || !time) {
	    console.error(`could not parse sensor data line: ${data}`);
	    return;
	}
	//console.log(id, values);
	let reading = new Reading(monoclock, date, time, values);
	this.monoclock = monoclock;
	this.update(id, reading);

	// if (!this.lastupdate || (this.monoclock - this.lastupdate > (1e9 * 10))) {
	//     this.lastupdate = this.monoclock;
	//     console.log();
	//     // for (let id of Object.keys(this.sensors).sort()) {
	//     // 	console.log(`${id}  ${this.sensors[id].reading.values}`);
	//     // }
	// }

	if (id === 'GNSS') {
	    if (!this.lastupdate) {
		this.lastupdate = this.monoclock;
	    }
	    let elapsed_secs = this.elapsed_secs(this.lastupdate);
	    if (elapsed_secs > 1.5) {
		console.log(elapsed_secs.toFixed(2), 'missed');
	    } else {
		console.log(elapsed_secs.toFixed(2));
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
	    console.error('KELL readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//console.log('update KELL');
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
	    console.error('GNSS readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//console.log('update GNSS');
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
	    console.error('BATT readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//console.log('update BATT');
    }
}


class SensorIMUN extends Sensor {
    constructor(id) {
	super(id, true);
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 10) {
	    console.error('IMUN readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
	//console.log('update IMUN');
    }
}
	

let sensorSubClasses = {
    'KELL': SensorKELL,
    'GNSS': SensorGNSS,
    'BATT': SensorBATT,
    'IMUN': SensorIMUN,
};


async function tests() {
    let sensorInput = new SensorInput();
    //sensorInput.init('../test/sampledata_fake.txt');
    //sensorInput.init('../test/sampledata_bad.txt');
    //sensorInput.init('../test/sampledata_huge.txt', { notail: true });
    //sensorInput.init('../test/MKN0001_M1_2021_02_18_21_03_01.725.txt', { notail: true });
    sensorInput.init('../test/MKN0002_M1_2021_02_22_17_03_57.423.txt', { notail: true });
    sensorInput.start();
}


if (require.main === module) {
    tests();
}
	

module.exports = SensorInput;
