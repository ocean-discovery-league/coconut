'use strict';

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1000000;
const MS_PER_SEC = 1000;

const DEFAULT_HISTORY_LIMIT = 10;
const GNSS_LOCK_LOSS_WINDOW_SECS = 15;
const GNSS_LOCK_REQUIRED_READS = 4;
const GNSS_HISTORY_LIMIT = Math.max(GNSS_LOCK_LOSS_WINDOW_SECS + 5, DEFAULT_HISTORY_LIMIT);  // we want at least GNSS_LOCK_LOCK_WINDOW_SECS worth

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};
log = console;  // FIXME



function elapsed_ms(start, end) {
    return Number((end - start) / BigInt(NS_PER_MS));
}


class Reading {
    constructor(monoclock, date, time, values) {
	this.monoclock = BigInt(monoclock);
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
	    this.history_limit = DEFAULT_HISTORY_LIMIT;
	    return this;
	}
    }


    update(reading) {
	this.reading = reading;
	this.reading_count++;
	this.history.unshift(this.reading);  // history[0] is also the current reading
	this.history.length = Math.min(this.history.length, this.history_limit);
	//log.debug('update', this.constructor.name);
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
	this.history_limit = GNSS_HISTORY_LIMIT;
	this.last_signal_locked_state = undefined;
    }


    update(reading) {
	if (!reading.values || reading.values.length !== 2) {
	    log.error('GNSS readings error, wrong number of numbers');
	    return;
	}
	super.update(reading);
    }


    getIsLocked(current_monoclock) {
	// Check the history and decide if we think we have a lock or
	// not. When there is no successful GPS read the GNSS line is
	// skipped in the sensor log file.

	// We transition into signal locked state if we
	// have >= GNSS_LOCK_REQUIRED_READS (4) reads in the last
	// GNSS_LOCK_LOSS_WINDOW_SECS (15) seconds. Unlocked state
	// is 0 reads in 15 seconds.  The transitions are separated
	// to keep from flapping in edge conditions

	// If we don't have enough reading yet return undefined. This
	// happens at the start of a mission even if the GPS is
	// getting signal because it takes at least
	// GNSS_LOCK_REQUIRED_READS sensor reports before we decide
	// it's locked, and they get reported about 1 per second

	// count how many GPS reads have succeeded in the last 15 seconds
	let recent_reads = 0;
	for (let reading of this.history) {
	    let ms = elapsed_ms(reading.monoclock, current_monoclock);
	    let secs = ms / MS_PER_SEC;
	    if (secs > GNSS_LOCK_LOSS_WINDOW_SECS) {
		break;
	    }
	    recent_reads++;
	}

	if (this.last_signal_locked_state === undefined) {
	    if (this.history.length >= GNSS_LOCK_REQUIRED_READS) {
		this.last_signal_locked_state = false;
	    }
	}

	let new_state = this.last_signal_locked_state;
	if (this.last_signal_locked_state === false) {
	    if (recent_reads >= GNSS_LOCK_REQUIRED_READS) {
		new_state = true;
	    }
	} else if (this.last_signal_locked_state === true) {
	    // all the GPS reads have to age out before we decide we lost signal
	    if (recent_reads === 0) {
		new_state = false;
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
