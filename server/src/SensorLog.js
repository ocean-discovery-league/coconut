'use strict';

const fs = require('fs');
const util = require('util');
const byline = require('byline');
const sensors = require('./sensors.js');
const MEDIA_DIR = '/var/www/html/media';

const shunt = () => {};
// safe stringify that won't throw an error
const safe_stringify = (o) => {
    try { return util.inspect(o, {breakLength: Infinity, colors: true}); }
    catch { return 'error stringifying'; /*+ ' ' + o*/ }};
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
        // DEID:mkn0014
        // MACA:b8:27:eb:2c:bd:6a
        // KELL:162390187667       20210222        170359.652      0.01    0.1     22.70
        // GNSS:162724467044       20210222        170359.983      42.3593454      -71.1120747
        // BATT:162868440360       20210222        170400.131      10.03
        // IMUN:163124978486       20210222        170400.383      -0.26   0.30    -0.82   42.5    -22.3   132.6   2546.7  -2126.7 -506.7  35.41

        // split before and after ':'
        let [, id, info] = line.split(/([^:]+):(.*)/);

        if (!info) {
            throw new Error(`malformed sensor log line: ${line}`);
        }

        if (!id || !info) {
            throw new Error(`could not parse sensor log line: ${line}`);
        }

        let monoclock, date, time, values;
        if (id === 'DEID' || id === 'MACA') {
            monoclock = 0;
            values = [info];
        } else {
            // timestamp(s) and values split by tabs
            [monoclock, date, time, ...values] = info.split('\t');

            if (!id || !monoclock || !date || !time) {
                throw new Error(`could not parse sensor log line: ${line}`);
            }
        }

        let reading = new sensors.Reading(monoclock, date, time, values);
        // if (log.debug) {
        //     log.debug(JSON.stringify(reading));  // can't stringify BigInts
        // }
        return [id, reading];
    }


    parseMonoclock(line) {
        let [id, reading] = this.parseLine(line);
        return reading.monoclock;
    }


    async extractFirstMonoclock(filename) {
        let firstline = await this.readFirstLine(filename);
        if (firstline) {
            return this.parseMonoclock(firstline);
        } else {
            return null;
        }
    }


    async readFirstLine(filename) {
        let readstream = fs.createReadStream(filename, 'utf8');
        let readbyline = byline.createStream(readstream);
        let firstline;
        await new Promise((resolve) => { readbyline.on('readable', resolve); });
        while (!firstline && firstline !== null) {
            firstline = readbyline.read();
            if (firstline && (firstline.startsWith('DEID') || firstline.startsWith('MACA'))) {
                firstline = undefined;
            }
        }
        readstream.destroy();
        return firstline;
    }
}


async function tests() {
    Object.assign(log, console);
    const fs = require('fs');

    let sensorLog = new SensorLog();

    let filename = '../test/MKN0002_M1_2021_02_22_17_03_57.423.txt';
    log.log('parsing test log file', filename);
    let readstream = fs.createReadStream(filename, 'utf8');
    let readbyline = byline.createStream(readstream);

    let lines = 0;
    let errors = 0;
    readbyline.on('data', (line) => {
        try {
            lines++;
            let [id, reading] = sensorLog.parseLine(line);
        } catch(err) {
            errors++;
            log.error('x', err);
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
