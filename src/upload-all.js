'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const MEDIA_DIR = '/var/www/html/media';

const shunt = () => {};
let log = {
    debug: shunt,
    log: shunt,
    warn: shunt,
    error: console.error,
};


class UploadAll extends EventEmitter {
    async init(app, io) {
	this.app = app;
	this.io = io;
	this.uploading = false;
	this.uploading_cancel = false;
	if (app) {
	    this.addRoutes(app);
	}
	fs.watch(MEDIA_DIR, { persistent: false, encoding: 'utf8'}, (t, f) => this.onDirChange(t, f));
    }


    addRoutes(app) {
	app.post('/uploadall', async (req, res) => {
	    if (!this.uploading) {
		this.uploading = true;
		try {
		    await this.uploadAll();
		    res.end();
		} catch(err) {
		    log.err(`uploadAll error ${err}`);
		    res.status(500).send(err.message);
		}
		this.uploading = false;
	    } else {
		log.err(`uploadAll already uploading`);
		res.status(500).send('already uploading');
	    }
	});

	app.post('/uploadall_cancel', async (req, res) => {
	    if (this.uplaoding) {
		if (this.tatorup) {
		    this.tatorup.kill();
		    this.tatorup = false;
		}
		this.uploading = false;
	    }
	});
    }
    

    async uploadAll() {
	let filelists = await this.getFileLists();
	//await this.uploadList(filelists.jpg, '28');  // FIXME what type_id for jpgs?
	await this.uploadList(filelists.mp4, '28');
    }


    async getFileLists() {
	let files = await fsP.readdir(MEDIA_DIR);
	let filelists = {
	    'jpg': [],
	    'mp4': [],
	    'h264': [],
	};
	for (let f of files) {
	    if (f.endsWith('.th.jpg')) {  // skip the thumbnails
		continue;
	    }
	    let ext = path.extname(f);
	    if (ext.startsWith('.')) {
		ext = ext.substring(1);
	    }
	    if (ext in filelists) {
		filelists[ext].push(f);
	    }
	}
	return filelists;
    }


    async onDirChange(eventType, filename) {
	console.log('change!');
	log.debug('media dir change event', eventType, filename);
	this.emit('change', this);
    }


    async uploadList(filelist, type_id='28') {
	for (let file of filelist.sort()) {  // FIXME .reverse()??
	    if (!this.uploading_cancel) {
		let filename = `${MEDIA_DIR}/${file}`;
		console.log('uploading', filename);
		await this.uploadOneFile(filename, type_id);
	    } else {
		break;
	    }
	}
    }


    async uploadOneFile(filename, type_id) {
	return new Promise( (resolve, reject) => {
	    //this.tatorup = spawn('/home/pi/git/maka-niu/code/TatorUpload.py', ['--type_id', type_id, '--media_path', filename]);
	    this.tatorup = spawn('/home/pi/git/coconut/src/pyout.py');
	    tatorup.stdout.on('data', (data) => {
		data = data.toString();
		log.log(data);
		this.reportProgress(data)
	    });
	    tatorup.stderr.on('data', (data) => log.error(data.toString()));
	    tatorup.on('error', (err) => {
		log.error('error running TatorUpload.py', err);
		this.tatorup = false;
		reject(err);
	    });
	    tatorup.on('close', (code) => {
		this.tatorup = false;
		resolve(code);
	    });
	});
    }


    reportProgress(line) {
	console.log('reportProgress', line);
    }
}


async function tests() {
    Object.assign(log, console);
    let uploadAll = new UploadAll();
    await uploadAll.init(null, null);
    console.time('filelists');
    let filelists = await uploadAll.getFileLists();
    console.timeEnd('filelists');
    console.log(`file list counts from ${MEDIA_DIR}:`);
    for (let ext of Object.keys(filelists).sort()) {
	console.log(`  ${ext} ${filelists[ext].length}`);
    }

    await uploadAll.uploadAll();

    console.log('waiting');
    setTimeout(() => console.log('done'), 10 * 1000);
}


if (require.main === module) {
    tests();
}
	

module.exports = UploadAll;
