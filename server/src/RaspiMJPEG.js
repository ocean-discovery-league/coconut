'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const { EventEmitter } = require('events');

const FIFO_FILENAME = '/var/www/html/FIFO';
const STATUS_FILENAME = '/var/www/html/status_mjpeg.txt';
const DEFAULT_STATUS_CHANGE_WAIT_TIMEOUT = 1000;  // 1sec
const COMMAND_MINIMUM_SETTLING_TIME = 200;  // 200ms
const USER_ANNOTATE_FILENAME = '/dev/shm/mjpeg/user_annotate.txt';

async function timeoutP(msecs) {
    return new Promise((resolve) => { setTimeout(resolve, msecs) });
}


const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    dir: shunt,
    info: console.info,
    warn: console.warn,
    error: console.error
};


class RaspiMJPEG extends EventEmitter {
    start() {
        this.current_state = false;
        this.last_status = false;
        fs.watch(STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
        this.getStatus(true);
    }


    async onStatusChange(eventType, filename) {
        log.log('raspimjpeg status file changed', eventType, filename);
        let status = await this.getStatus();
        log.log('new raspimjpeg status:', status);
        this.emit('statuschange', status);
    }


    async getStatus(sync) {
        log.log('reading raspimjpeg status...');
        let status;
        if (!sync) {
            status = await fsP.readFile(STATUS_FILENAME, 'utf8');
        } else {
            status = fs.readFileSync(STATUS_FILENAME, 'utf8');
        }
        this.last_status = status;
        log.log('raspimjpeg status:', status);
        return status;
    }


    async setFilenameAnnotation() {
        let serial_number = os.hostname();
        let date_now = new Date(Date.now());
        let time_stamp = date_now.toISOString();
        // example: 2021-06-12T16:05:58.089Z
        time_stamp = time_stamp.replace('T', '_');
        time_stamp = time_stamp.replace('Z', '');
        time_stamp = time_stamp.replace(/:/g, '_');
        time_stamp = time_stamp.replace(/-/g, '_');
        let annotation = `${serial_number}_${time_stamp}`;
        log.log('setting filename annotation to', annotation);
        await fsP.writeFile(USER_ANNOTATE_FILENAME, annotation, 'utf8');
    }


    async sendCommand(command, waitforstatuschange=true, startcameraifhalted=true) {
        if (startcameraifhalted) {
            await this.startCameraIfHalted();
        }
        log.log('writing raspimjpeg command:', command);
        let fifo = await fsP.writeFile(FIFO_FILENAME, command + '\n', 'utf8');
        log.log('raspimjpeg command written');
        let status = undefined;
        if (waitforstatuschange) {
            log.log('waiting for status change...');
            status = await this.waitForStatusChange();
        }

        // give things some breathing room
        // also important because the file change events seem to come in pairs and we want to ignore the second one
        await timeoutP(COMMAND_MINIMUM_SETTLING_TIME);
        log.debug('');  // separates the commands in debug output
        return status;
    }


    async waitForStatusChange(timeoutms=DEFAULT_STATUS_CHANGE_WAIT_TIMEOUT) {
        return new Promise((resolve) => {
            let timeout;
            let handler = (status) => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                resolve(status);
            };

            this.once('statuschange', handler);

            if (timeoutms) {
                timeout = setTimeout(() => {
                    this.removeListener('statuschange', handler);
                    timeout = undefined;
                    log.debug('wait for status change timed out');
                    resolve('timeout')
                }, timeoutms);
            }
        });
    }


    async startCameraIfHalted() {
        log.debug('starting camera if halted');
        let status = await this.getStatus();
        if (status === 'halted') {
            log.info('starting camera...');
            let status = await this.sendCommand('ru 1', true, false);
            log.info('camera started');
        } else {
            log.debug('camera was not halted');
        }
    }


    async haltCameraIfNotHalted() {
        log.debug('halting camera if not already halted');
        let status = await this.getStatus();
        if (status !== 'halted') {
            log.info('halting camera...');
            let status = await this.sendCommand('ru 0', true, false);
            log.info('camera halted');
        } else {
            log.debug('camera was already halted');
        }
    }
}


async function tests() {
    log = console;  // print all debug levels
    let raspiMJPEG = new RaspiMJPEG();
    raspiMJPEG.start();
    await timeoutP(1000);
    //await raspiMJPEG.sendCommand('im');
    //await raspiMJPEG.sendCommand('ru 1');
    await raspiMJPEG.sendCommand('ru 0', true, false);
    log.log(await raspiMJPEG.getStatus());
    await timeoutP(3000);

    await raspiMJPEG.sendCommand('is 800');
    await raspiMJPEG.sendCommand('ca 1');
    await raspiMJPEG.sendCommand('br 55');
    log.log(await raspiMJPEG.getStatus());
    await timeoutP(5000);
    await raspiMJPEG.sendCommand('ca 0');
    await raspiMJPEG.sendCommand('sy boxh264.sh box');
}


if (require.main === module) {
    tests();
}


module.exports = RaspiMJPEG;
