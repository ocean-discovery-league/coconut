'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const { EventEmitter } = require('events');

const MEDIA_DIR = '/var/www/html/media';
const RING_STATUS_FILENAME = '/home/pi/git/maka-niu/code/log/status.txt';
const TEST_STATUS_FILENAME = __dirname + '/../test/status.txt';
const STATUS_FILENAME = (os.platform() === 'darwin') ? TEST_STATUS_FILENAME : RING_STATUS_FILENAME;

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};
log = console;  // FIXME


class RingInput extends EventEmitter {
    async init() {
    fs.watch(STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
    this.last_status = await this.readStatus(true);
    }


    async onStatusChange(eventType, filename) {
    log.debug('ring status file change event', eventType, filename);
    let status = await this.readStatus();
    if (status !== this.last_status) {
        this.last_status = status;
        this.emit('change', this);
    }
    }


    async readStatus() {
    log.debug('reading ring status...');
    let status;
    status = await fsP.readFile(STATUS_FILENAME, 'utf8');
    log.debug('ring position:', status);
    return status;
    }


    parseStatus() {
    let modenum;
    let filename;
    if (this.last_status) {
        if (this.last_status.includes(' ')) {
        [, modenum, filename] = this.last_status.split(/([^ ]+) (.*)/);
        } else {
        modenum = this.last_status;
        }
    }
    return [modenum, filename];
    }


    getModenum() {
    let [modenum, filename] = this.parseStatus();
    return modenum;
    }


    getSensorLogFilename() {
    let [modenum, filename] = this.parseStatus();
    if (filename && !filename.includes('/')) {
        filename = MEDIA_DIR + '/' + filename;
    }
    return filename;
    }
}


async function tests() {
    log = console;
    let ringInput = new RingInput();
    await ringInput.init();

    let report = function(ring, tagline) {
    let modenum = ring.getModenum();
    let filename = ring.getSensorLogFilename();
    log.log(`${tagline}: ${ring.last_status}`);
    log.log(`  mode num: ${modenum}`);
    if (filename) {
        log.log(`  sensor log: ${filename}`);
    } else {
        log.log('  no sensor log');
    }
    };

    report(ringInput, 'current ring status');
    ringInput.on('change', (ring) => {
    report(ring, 'ring changed');
    });
    log.log('to test: spin that ring! you have 20 seconds');
    setTimeout(() => log.log('exiting'), 20 * 1000);
}


if (require.main === module) {
    tests();
}


module.exports = RingInput;
