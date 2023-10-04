'use strict';

const fs = require('fs');
const { Writable } = require('stream');
const { stringify } = require('csv-stringify/sync');
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
log = console;


class SensorWriteCSV extends Writable {
    start(filename) {
        this.outputstream = fs.createWriteStream(filename, 'utf8');
        let header = ['Sensor', 'Date', 'Time'];  // header
        let header_final = ['Monoclock'];
        for (let id of SENSOR_ORDER) {
            header = header.concat(HEADERS[id]);
        }
        header = header.concat(header_final);
        header = header.map((el) => el.toUpperCase());
        log.debug('wtf', header);
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
