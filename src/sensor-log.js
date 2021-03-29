'use strict';

const fs = require('fs');
const byline = require('byline');
const sensors = require('./sensors');
const MEDIA_DIR = '/var/www/html/media';

const shunt = () => {};
// safe stringify that won't throw an error
const safe_stringify = (...args) => {
    try { return JSON.stringify(...args) }
    catch { return 'error stringifying' /*+ ' ' + args[0]*/ }};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error,
    stringify: safe_stringify,
};


class SensorLog {
    parseLine(line) {
	line = line.toString('utf8');  // voodoo
	if (!line) {
	    throw new Error('sensor log line can not be blank');
	}

	// some examples:
	// KELL:162390187667       20210222        170359.652      0.01    0.1     22.70
	// GNSS:162724467044       20210222        170359.983      42.3593454      -71.1120747
	// BATT:162868440360       20210222        170400.131      10.03
	// IMUN:163124978486       20210222        170400.383      -0.26   0.30    -0.82   42.5    -22.3   132.6   2546.7  -2126.7 -506.7  35.41

	// split before and after ':'
	let [, id, info] = line.split(/([^:]+):(.*)/);

	if (!info) {
	    throw new Error(`malformed sensor log line: ${line}`);
	}

	// timestamp(s) and values split by tabs
	let [monoclock, date, time, ...values] = info.split('\t');

	if (!id || !monoclock || !date || !time) {
	    throw new Error(`could not parse sensor log line: ${line}`);
	}

	let reading = new sensors.Reading(monoclock, date, time, values);
	if (log.debug) {
	    log.debug('reading', log.stringify(reading));
	}
	return [id, reading];
    }
	

    parseMonoclock(line) {
	let [id, reading] = this.parseLine(line);
	return reading.monoclock;
    }


    async extractFirstMonoclock(filename) {
    	let firstline = await this.readFirstLine(filename);
	return this.parseMonoclock(firstline);
    }


    async readFirstLine(filename) {
	let readstream = fs.createReadStream(filename, 'utf8');
	let a_byline = byline.createStream(readstream);
	let firstline = await new Promise((resolve) => {
	    a_byline.once('data', (line) => resolve(line));
	});
	readstream.destroy();
	return firstline;
    }
}


async function tests() {
    log = console;
    log.stringify = safe_stringify;
    const fs = require('fs');
    const byline = require('byline');

    let sensorLog = new SensorLog();

    let filename = '../test/MKN0002_M1_2021_02_22_17_03_57.423.txt'
    log.log('parsing test log file', filename);
    let readstream = fs.createReadStream(filename, 'utf8');
    let readbyline = byline.createStream(readstream);

    let lines = 0;
    let errors = 0;
    readbyline.on('data', (line) => {
	try {
	    lines++;
	    let [id, reading] = sensorLog.parse(line);
	} catch(err) {
	    errors++;
	    log.error(err);
	}
    });

    readbyline.on('end', () => {
	log.log(`${lines} lines, ${errors} errors`);
	if (errors) {
	    throw new Error('errors parsing test log file');
	}
    });
}


if (require.main === module) {
    tests();
}
	

module.exports = SensorLog;
