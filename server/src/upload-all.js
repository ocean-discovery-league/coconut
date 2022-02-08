'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const MEDIA_DIR = (os.platform() === 'darwin') ? (__dirname + '/../test/media') : '/var/www/html/media';

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

	this.io.on('connection', (socket) => {
	    console.log('client connected');
	    this.onDirChange();
	});
    }


    addRoutes(app) {
	app.post('/uploadall', async (req, res) => {
	    if (!this.uploading) {
		this.uploading = true;
		this.uploading_cancel = false;
		console.log('uploadall started');
		try {
		    await this.uploadAll();
		    let text = '';
		    if (this.uploading_cancel) {
			text = 'Uploading canceled';
		    }
		    res.end(text);
		    console.log('uploadall finished');
		} catch(err) {
		    log.error('uploadall error', err);
		    res.status(500).send(err.message);
		    console.log('uploadall finished with error');
		}
		this.uploading = false;
	    } else {
		log.error(`uploadall already uploading`);
		res.status(500).send('already uploading');
	    }
	});

	app.post('/uploadall_cancel', async (req, res) => {
	    if (this.uploading) {
		console.log('canceling upload...');
		this.uploading_cancel = true;
		if (this.tatorup) {
		    this.tatorup.kill();
		    this.tatorup = false;
		}
		this.uploading = false;
		res.end();
	    } else {
		log.error(`uploadall already canceling`);
		res.status(500).send('already canceling uploading');
	    }
	});
    }
    

    async uploadAll() {
	this.upload_filelists = await this.getFileLists();
	// ordered from smallest to largest (txt, jpg, mp4):
	let file_ext_type_ids = [
	    { ext: 'txt', type_id: 1, attach: true},  // type_id is ignored for attachments
	    { ext: 'jpg', type_id: 120 },
	    { ext: 'mp4', type_id: 28 },
	];

	this.uploads_total_file_count = 0;
	for (let { ext, type_id } of file_ext_type_ids) {
	    if (ext in this.upload_filelists) {
		this.uploads_total_file_count += this.upload_filelists[ext].length;
	    }
	}
	console.log('this.uploads_total_file_count', this.uploads_total_file_count);
	    
	// quick and dirty hack to just have something stable to attach txt files to
	let media_id = await this.createMediaId();

	for (let { ext, type_id, attach } of file_ext_type_ids) {
	    if (ext in this.upload_filelists) {
		console.log(`uploading ${this.upload_filelists[ext].length} ${ext}s with type_id ${type_id}`);
		if (attach) {
		    await this.uploadList(this.upload_filelists[ext], type_id, media_id);
		} else {
		    await this.uploadList(this.upload_filelists[ext], type_id);
		}
	    }
	}
    }


    async createMediaId() {
	this.upload_media_id = false;
	await this.uploadOneFile(__dirname + '/../static/tatorfile.jpg', 120);
	let media_id;
	if (this.upload_media_id) {
	    media_id = this.upload_media_id;
	    delete this.upload_media_id;
	    console.log('got the media_id!', media_id);
	}
	return media_id;
    }


    async getFileLists() {
	let files = await fsP.readdir(MEDIA_DIR);
	let filelists = {
	    'jpg':  [],
	    'mp4':  [],
	    'h264': [],
	    'txt':  [],
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
	console.log('onDirChange!');
	log.debug('media dir change event', eventType, filename);
	if (!this.reporting_change) {
	    // give it a half second
	    this.reporting_change = true;
	    await new Promise( (res) => setTimeout(res, 500) );
	    let filelists = await this.getFileLists();
	    this.reporting_change = false;
	    
	    let filecounts = this.countFiles(filelists);
	    console.log('emit', filecounts);
	    this.io.emit('filecounts', filecounts);
	}	    
    }


    countFiles(filelists) {
	let filecounts = {};
	for (let ext of Object.keys(filelists)) {
	    filecounts[ext] = filelists[ext].length;
	}
	return filecounts;
    }


    async uploadList(filelist, type_id='28', media_id=false) {
	let n=0;
	for (let file of filelist.sort()) {  // FIXME .reverse()??
	    if (!this.uploading_cancel) {
		let filename = `${MEDIA_DIR}/${file}`;
		console.log('uploading', filename);
		this.reportUploadProgress(n, filelist, this.upload_filelists);
		await this.uploadOneFile(filename, type_id, media_id);
		n+=1;
		this.reportUploadProgress(n, filelist, this.upload_filelists);
	    } else {
		break;
	    }
	}
    }


    async uploadOneFile(filename, type_id, media_id=false) {
	return new Promise( (resolve, reject) => {
	    //this.tatorup = spawn('/home/pi/git/coconut/test/FakeTatorUpload.py');
	    if (media_id) {
		this.tatorup = spawn('/home/pi/git/maka-niu/code/TatorUpload.py', ['--type_id', type_id, '--media_path', filename, '--media_id', media_id]);
	    } else {
		this.tatorup = spawn('/home/pi/git/maka-niu/code/TatorUpload.py', ['--type_id', type_id, '--media_path', filename]);
	    }
	    this.tatorup.stdout.on('data', (data) => {
		data = data.toString();
		log.log(data);
		this.reportUploadSingleFileProgress(data)
	    });
	    this.tatorup.stderr.on('data', (data) => log.error(data.toString()));
	    this.tatorup.on('error', (err) => {
		log.error('error running TatorUpload.py', err);
		this.tatorup = false;
		reject(err);
	    });
	    this.tatorup.on('close', (code) => {
		this.tatorup = false;
		resolve(code);
	    });
	});
    }


    reportUploadProgress(n, filelist, filelists) {
	let progress = {};
	let of = filelist.length-1;
	let ext = path.extname(filelist[0]);
	if (ext.startsWith('.')) {
	    ext = ext.substring(1);
	}
	let filecounts = this.countFiles(this.upload_filelists);
	this.io.emit('uploadprogress', { n, of, ext, filecounts });
    }


    reportUploadSingleFileProgress(line) {
	console.log('reportUploadSingleFileProgress', line);
	// we are also going to try and snag the media_id from the
	// end of the current upload for our txt file upload hack
	if (line && line.includes(':response body:')) {
	    if (line.includes('Image saved successfully')) {
		try {
		    line = line.trim();  // remove newlines, linefeeds
		    let matches = line.match(/:response body: b'(.*)'$/);
		    if (matches && matches.length === 2) {
			let data = JSON.parse(matches[1]);
			console.log('data', data);
			if (data.message && data.message.includes('Image saved successfully')) {
			    if (data.id) {
				this.upload_media_id = data.id;
				console.log('spotted the media id!', this.upload_media_id);
			    } else {
				console.error('did not spot the media id');
			    }
			} else {
			    console.error('could not parse the response body for the media id');
			    console.error(matches);
			}
		    }
		} catch(err) {
		    console.error('error thrown while spotting media id', err);
		}
	    }
	}
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
