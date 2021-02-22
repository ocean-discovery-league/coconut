'use strict';

const fs = require('fs');
const fsP = require('fs').promises;

const FIFO_FILENAME = '/var/www/html/FIFO';
const STATUS_FILENAME = '/var/www/html/status_mjpeg.txt';

async function promiseTimeout(msecs) {
    return new Promise((resolve) => { setTimeout(resolve, msecs) });
}



class RaspiMJPEG {
    start() {
	this.current_state = false;
	this.last_status = false;
	fs.watch(STATUS_FILENAME, { persistent: false, encoding: 'utf8'}, (t, f) => this.onStatusChange(t, f));
	this.getStatus(true);
    }


    async onStatusChange(eventType, filename) {
	console.log('raspimjpeg status file changed', eventType, filename);
	let status = await this.getStatus();
    }


    async getStatus(sync) {
	console.log('reading raspimjpeg status...');
	let status;
	if (!sync) {
	    status = await fsP.readFile(STATUS_FILENAME, 'utf8');
	} else {
	    status = fs.readFileSync(STATUS_FILENAME, 'utf8');
	}
	console.log('raspimjpeg status:', status);
	this.last_status = status;
	return status;
    }


    async sendCommand(command) {
	console.log('writing raspimjpeg command:', command);
	let fifo = await fsP.writeFile(FIFO_FILENAME, command, 'utf8');
	console.log('raspimjpeg command written');
    }
}


async function tests() {
    let raspiMJPEG = new RaspiMJPEG();
    raspiMJPEG.start();
    await promiseTimeout(1000);
    await raspiMJPEG.sendCommand('im');
    console.log(await raspiMJPEG.getStatus());
    await promiseTimeout(1000);
}


if (require.main === module) {
    tests();
}


module.exports = RaspiMJPEG;
