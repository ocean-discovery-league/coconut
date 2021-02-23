'use strict';

const fs = require('fs');
const fsP = require('fs').promises;

const FIFO_FILENAME = '/var/www/html/FIFO';
const STATUS_FILENAME = '/var/www/html/status_mjpeg.txt';

async function promiseTimeout(msecs) {
    return new Promise((resolve) => { setTimeout(resolve, msecs) });
}

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error
};


class RaspiMJPEG {
    start() {
	this.current_state = false;
	this.last_status = false;
	fs.watch(STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
	this.getStatus(true);
    }


    async onStatusChange(eventType, filename) {
	log.log('raspimjpeg status file changed', eventType, filename);
	let status = await this.getStatus();
	log.log('raspimjpeg status:', status);
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
	return status;
    }


    async sendCommand(command) {
	log.log('writing raspimjpeg command:', command);
	let fifo = await fsP.writeFile(FIFO_FILENAME, command, 'utf8');
	log.log('raspimjpeg command written');
    }
}


async function tests() {
    log = console;
    let raspiMJPEG = new RaspiMJPEG();
    raspiMJPEG.start();
    await promiseTimeout(1000);
    await raspiMJPEG.sendCommand('im');
    log.log(await raspiMJPEG.getStatus());
    await promiseTimeout(1000);
}


if (require.main === module) {
    tests();
}


module.exports = RaspiMJPEG;
