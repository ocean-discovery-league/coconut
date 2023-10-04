#!/usr/bin/env node
'use strict';

const fs = require('fs');

const csv = require('csv');
const byline = require('byline');
const { stringify } = require('csv-stringify/sync');

const SensorLog = require('./server/src/SensorLog.js');
const SensorReadTxt = require('./server/src/SensorReadTxt.js');
const SensorWriteCSV = require('./server/src/SensorWriteCSV.js');
const { HEADERS } = require('./server/src/sensors.js');

let log = {};
Object.assign(log, console);


main();

async function main() {
    let txt_filename = 'test/MKN0023_2023_04_09_23_52_07.354.txt';
    let csv_filename = 'MKN0023_2023_04_09_23_52_07.354.csv';

    let sensorReadTxt = new SensorReadTxt();
    await sensorReadTxt.init();
    log.log('parsing log file', txt_filename);
    await sensorReadTxt.start(txt_filename, true, 1000000.0);

    let sensorWriteCSV = new SensorWriteCSV();
    log.log('generating csv file', csv_filename);
    sensorWriteCSV.start(csv_filename);
    //sensorReadTxt.pipe(sensorWriteCSV);
    sensorReadTxt.on('line', (line) => sensorWriteCSV.write(line));
    sensorReadTxt.on('close', (line) => sensorWriteCSV.end());


    return;


    let sensorLog = new SensorLog();

    log.log('parsing test log file', filename);
    let readstream = fs.createReadStream(txt_filename, 'utf8');
    let readbyline = byline.createStream(readstream);


    let lines = 0;
    let errors = 0;

    let header = ['Sensor', 'Date', 'Time'];  // header
    let header_sensor_order = ['KELL', 'BATT', 'GNSS', 'IMUN'];
    let header_final = ['Monoclock'];
    for (let id of header_sensor_order) {
        header = header.concat(HEADERS[id]);
    }
    header = header.concat(header_final);
    header = header.map((el) => el.toUpperCase());

    let records = [];
    records.push(header);

    readbyline.on('line', (line) => {
        try {
            lines++;
            let [id, reading] = sensorLog.parseLine(line);
            //log.log(id, reading);
            let record = [id, reading.date, reading.time];
            for (let header_id of header_sensor_order) {
                if (id === header_id) {
                    record = record.concat(reading.values);
                } else {
                    record = record.concat(new Array(HEADERS[header_id].length));
                }
            }
            record = record.concat([reading.monoclock]);
            records.push(record);
            //log.log(records);
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
        //log.log(records);
        log.log('generating sensors.csv');
        let output = stringify(records);
        fs.writeFileSync('sensors.csv', output);
    });

}
