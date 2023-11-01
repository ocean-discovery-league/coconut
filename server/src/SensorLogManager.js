'use strict';

const path = require('path');
const SensorReadTxt = require('./SensorReadTxt.js');
const SensorWriteCSV = require('./SensorWriteCSV.js');
const { MEDIA_DIR } = require('./MediaWatcher.js');

let log = console;


class SensorLogManager {
    async init(ringInput, mediaWatcher) {
        this.ringInput = ringInput;
        this.mediaWatcher = mediaWatcher;
    }


    async createMissingCSVs() {
        let allMediaFiles = await this.mediaWatcher.getAllFiles(undefined, true, false);
        let filesByGroup = this.mediaWatcher.groupFilesByType(allMediaFiles);
        let logFiles = filesByGroup['log'];

        let txtFilenames = [];
        let csvFilenames = [];
        for (let file of logFiles) {
            let group;
            if (file.name.endsWith('.id.txt')) {
                continue;
            }
            let ext = path.extname(file.name);
            if (ext.startsWith('.')) {
                ext = ext.substring(1);
            }
            if (ext === 'txt') {
                txtFilenames.push(file.name);
            }
            if (ext === 'csv') {
                csvFilenames.push(file.name);
            }
        }

        let current_active_filename = this.ringInput.getSensorLogFilename();
        let regex = /[.]txt$/;
        for (let txt_filename of txtFilenames) {
            if (txt_filename === current_active_filename) {
                continue;  // the active one will be taken care of when we start()
            }
            let csv_filename = txt_filename.replace(regex, '.csv');
            try {
                if (!csvFilenames.includes(csv_filename)) {
                    // missing csv file! convert it!
                    log.log('generating missing csv file!', csv_filename);
                    let sensorReadTxt = new SensorReadTxt();
                    await sensorReadTxt.init();
                    let sensorWriteCSV = new SensorWriteCSV();
                    await sensorReadTxt.start(`${MEDIA_DIR}/${txt_filename}`, true, null, true);
                    sensorWriteCSV.start(`${MEDIA_DIR}/${csv_filename}`);
                    sensorReadTxt.on('line', (line) => sensorWriteCSV.write(line));
                    // let waitForClose = new Promise( (resolve) => {   // awaiting this causes node 10 to exit!
                    //    sensorReadTxt.once('close', () => { sensorWriteCSV.end(); resolve(); });
                    // });
                    //await waitForClose;
                    //log.log('finished writing', csv_filename);
                    sensorReadTxt.on('end', () => {
                        sensorWriteCSV.end();
                        log.log('finished writing', csv_filename);
                    });
                }
            } catch(err) {
                log.error('error while generating csv file', csv_filename, err);
            }
        }
    }


    async start() {
        this.ringInput.on('change', () => this.ringChangeHandler());
        let filename = this.ringInput.getSensorLogFilename();
        if (filename) {
            this.startWritingCSV();
        }
    }


    async ringChangeHandler() {
        let [new_modenum, new_filename] = this.ringInput.parseStatus();
        if (new_filename !== this.txt_input_filename) {
            await this.stopWritingCSV();
        }
        if (new_filename) {
            await this.startWritingCSV();
        }
    }


    async startWritingCSV() {
        this.txt_input_filename = this.ringInput.getSensorLogFilename();
        if (this.txt_input_filename) {
            this.sensorReadTxt = new SensorReadTxt();
            await this.sensorReadTxt.init();
            this.sensorWriteCSV = new SensorWriteCSV();
            await this.sensorReadTxt.start(this.txt_input_filename);
            let csv_output_filename = this.txt_input_filename.replace(/[.]txt$/, '.csv');
            log.log('writing csv file', this.text_input_filename);
            this.sensorWriteCSV.start(csv_output_filename);
            this.sensorReadTxt.on('line', (line) => this.sensorWriteCSV.write(line));
            this.sensorReadTxt.on('close', (line) => this.sensorWriteCSV.end());
        } else {
            log.error('no sensor filename specified, not writing csv');
        }
    }


    async stopWritingCSV() {
        if (this.sensorReadTxt) {
            this.sensorReadTxt.stop();
            delete this.sensorReadTxt;
        }
        if (this.sensorWriteCSV) {
            this.sensorWriteCSV.close();
            delete this.sensorWriteCSV;
        }
        delete this.txt_input_filename;
    }
}


async function tests() {
    log = console;
}


if (require.main === module) {
    tests();
}


module.exports = SensorLogManager;
