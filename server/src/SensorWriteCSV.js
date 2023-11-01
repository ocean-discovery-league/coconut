'use strict';

const fs = require('fs');
const { Writable } = require('stream');
let stringify;
if (process.version.startsWith('v10.')) {
    stringify = require('/usr/local/coconut/node_modules/csv-stringify/dist/cjs/sync.cjs').stringify;
} else {
    stringify = require('csv-stringify/sync').stringify;
}
const SensorLog = require('./SensorLog.js');
const { HEADERS } = require('./sensors.js');

const SENSOR_ORDER = ['KELL', 'BATT', 'GNSS', 'IMUN'];

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


class SensorWriteCSV extends Writable {
    start(filename_or_stream) {
        if (typeof filename_or_stream === 'object') {
            this.outputstream = filename_or_stream;
        } else {
            this.outputstream = fs.createWriteStream(filename_or_stream, 'utf8');
        }
        let header = ['Sensor', 'Date', 'Time'];  // header
        let header_final = ['Monoclock'];
        for (let id of SENSOR_ORDER) {
            header = header.concat(HEADERS[id]);
        }
        header = header.concat(header_final);
        header = header.map((el) => el.toUpperCase());
        let csv = stringify([header]);
        this.outputstream.write(csv);
        this.sensorLog = new SensorLog();
        this.lines = 0;
        this.error = 0;
    }


    _write(line, encoding, next) {
        this.lines++;
        try {
            let [id, reading] = this.sensorLog.parseLine(line);
            let record = [id, reading.date, reading.time];
            for (let header_id of SENSOR_ORDER) {
                if (id === header_id) {
                    record = record.concat(reading.values);
                } else {
                    record = record.concat(new Array(HEADERS[header_id].length));
                }
            }
            record = record.concat([reading.monoclock]);
            log.debug(record);
            let csv = stringify([record]);
            this.outputstream.write(csv);
        } catch(err) {
            this.errors++;
            log.error('SensorWriteCSV error:', err);
        }
        next();
    }


    _final(callback) {
        this.outputstream.end();
        callback();
    }
}


async function tests() {
    log = console;
}


if (require.main === module) {
    tests();
}


module.exports = SensorWriteCSV;
