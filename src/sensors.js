'use strict';

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


function elapsed_secs(start, end) {
    return (end - start) / 1e9;
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


    getDepthInMeters() {
	if (this.reading && this.reading.values) {
	    return this.reading.values[1];
	} else {
	    return undefined;
	}
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


    getIsLocked(currentclock) {
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
	    if (elapsed_secs(currentclock, reading.monoclock) > 30) {
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
    log = console;
}


if (require.main === module) {
    tests();
}
	

module.exports = { Sensor, Reading };
