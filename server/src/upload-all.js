'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const MEDIA_DIR =
      (os.platform() === 'darwin')
      ? (__dirname + '/../test/media')
      : '/var/www/html/media';

const TATOR_UPLOAD_SCRIPT =
      (os.platform() === 'darwin')
      ? (__dirname + '/../test/FakeTatorUpload.py')
      : (__dirname + '/../../scripts/TatorUpload.py');

const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    warn: console.warn,
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
            log.log('client connected');
            this.onDirChange();
            if (this.uploading) {
                this.reportUploadProgress();
            }
        });
    }


    addRoutes(app) {
        app.post('/uploadall', async (req, res) => {
            if (!this.uploading) {
                this.uploading = true;
                this.uploading_cancel = false;
                log.log('uploadall started');
                try {
                    await this.uploadAll();
                    let text = '';
                    if (this.uploading_cancel) {
                        text = 'Uploading canceled';
                    }
                    res.end(text);
                    this.io.emit('uploadfinished', text);
                    log.log('uploadall finished');
                } catch(err) {
                    log.error('uploadall error', err);
                    res.status(500).send(err.message);
                    this.io.emit('uploaderror', err.message);
                    log.log('uploadall finished with error');
                }
                this.uploading = false;
            } else {
                log.error(`uploadall already uploading`);
                res.status(500).send('already uploading');
            }
        });

        app.post('/uploadall_cancel', async (req, res) => {
            if (this.uploading) {
                log.log('canceling upload...');
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
        this.upload_filecounts = this.countFiles(this.upload_filelists);
        this.io.emit('uploadstarted', { filecounts: this.upload_filecounts });

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
        log.log('this.uploads_total_file_count', this.uploads_total_file_count);

        // if (this.uploads_total_file_count === 0) {
        // }

        log.info('fetching list of existing tator media files');
        let tator_file_list = await this.listTatorFiles();
        log.info(`current tator media list has ${tator_file_list.length} items`);

        let duplicate_count = 0;
        let file_sizes = {};
        for (let { ext, type_id, attach } of file_ext_type_ids) {
            if (ext in this.upload_filelists) {
                let filelist = this.upload_filelists[ext];
                filelist = filelist.filter( filename => !tator_file_list.includes(filename) );
                duplicate_count += this.upload_filelists[ext].length - filelist.length;
                this.upload_filelists[ext] = filelist;

                log.info(`stating ${ext} files`);
                for (let filename of filelist) {
                    let size = 0;
                    try {
                        let stat = await fsP.stat(`${MEDIA_DIR}/${filename}`);
                        size = stat.size;
                    } catch(err) {
                        log.error(`could not stat upload size for ${filename}`, err);
                    }
                    file_sizes[filename] = size;
                }
            }
        }
        log.info(`skipping ${duplicate_count} files that have already been uploaded`);

        let total_size = 0;
        for (let k in file_sizes) {
            total_size += file_sizes[k];
        }
        log.info(`uploading ${total_size} bytes from ${Object.keys(file_sizes).length} files`);

        let media_id;
        for (let { ext, type_id, attach } of file_ext_type_ids) {
            if (ext in this.upload_filelists) {
                log.log(`uploading ${this.upload_filelists[ext].length} ${ext}s with type_id ${type_id}`);
                if (attach) {
                    if (!media_id) {
                        // quick and dirty hack to just have something stable to attach txt files to
                        log.info('uploading placard image for attaching files to');
                        media_id = await this.createMediaId();
                    }
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
            log.log('got the media_id!', media_id);
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
        log.debug('onDirChange', eventType, filename);
        if (!this.reporting_change) {
            // give it a half second
            this.reporting_change = true;
            await new Promise( (res) => setTimeout(res, 500) );
            let filelists = await this.getFileLists();
            this.reporting_change = false;

            let filecounts = this.countFiles(filelists);
            log.debug('emit', filecounts);
            this.io.emit('filecounts', { filecounts });
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
                log.log('uploading', filename);
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
            let args = [
                '--nodupecheck',
                '--type_id', type_id,
                '--media_path', filename];
            if (media_id) {
                args.push('--media_id', media_id);
            }

            this.tatorup = spawn(TATOR_UPLOAD_SCRIPT, args);

            this.tatorup.stdout.on('data', (data) => {
                // hopefully it's always a complete line, and only one line
                let line = data.toString();
                line.trim();
                log.log(line);
                if (line) {
                    this.reportUploadSingleFileProgress(line);
                }
            });
            this.tatorup.stderr.on('data', (data) => log.error(data.toString()));
            this.tatorup.on('error', (err) => {
                log.error(`error running tator upload script ${TATOR_UPLOAD_SCRIPT}`, err);
                this.tatorup = false;
                reject(err);
            });
            this.tatorup.on('close', (code) => {
                this.tatorup = false;
                resolve(code);
            });
        });
    }


    async listTatorFiles() {
        return new Promise( (resolve, reject) => {
            let args = ['--list'];

            this.tatorup = spawn(TATOR_UPLOAD_SCRIPT, args);

            let json = '';
            this.tatorup.stdout.on('data', (data) => {
                // hopefully it's always a complete line, and only one line
                let line = data.toString();
                json += line;
            });
            this.tatorup.stderr.on('data', (data) => log.error(data.toString()));
            this.tatorup.on('error', (err) => {
                log.error(`error running tator upload script ${TATOR_UPLOAD_SCRIPT}`, err);
                this.tatorup = false;
                reject(err);
            });
            this.tatorup.on('close', (code) => {
                this.tatorup = false;
                let list = [];
                try {
                    list = JSON.parse(json);
                } catch(err) {
                    log.error(`error parsing json for media list from ${TATOR_UPLOAD_SCRIPT}`, err);
                }
                resolve(list);  // json parsing errors cause an empty list to be returned
            });
        });
    }


    reportUploadProgress(n, filelist, filelists) {
        if (n !== undefined) {
            let of = filelist.length-1;
            let ext = path.extname(filelist[0]);
            if (ext.startsWith('.')) {
                ext = ext.substring(1);
            }
            this.lastProgressUpdate = { n, of, ext, filecounts: this.upload_filecounts };
        }
        this.io.emit('uploadprogress', this.lastProgressUpdate);
    }


    reportUploadSingleFileProgress(line) {
        //log.log('reportUploadSingleFileProgress', line);

        // we are also going to try and snag the media_id from the
        // end of the current upload for our txt file upload hack
        if (line.includes(':response body:')) {
            if (line.includes('Image saved successfully')) {
                try {
                    line = line.trim();  // remove newlines, linefeeds
                    let matches = line.match(/:response body: b'(.*)'$/);
                    if (matches && matches.length === 2) {
                        let data = JSON.parse(matches[1]);
                        log.debug('data', data);
                        if (data.message && data.message.includes('Image saved successfully')) {
                            if (data.id) {
                                this.upload_media_id = data.id;
                                log.log('spotted the media id!', this.upload_media_id);
                            } else {
                                log.error('did not spot the media id');
                            }
                        } else {
                            log.error('could not parse the response body for the media id');
                            log.error(matches);
                        }
                    }
                } catch(err) {
                    log.error('error thrown while spotting media id', err);
                }
            }
        }

        if (line.includes(':Upload progress:')) {
            let text = line.split(':Upload progress:')[1];
            text = text.trim();
            let percent;
            if (text.endsWith('%')) {
                let percent = Number(text.slice(0, -1));
                console.log(`percent complete ${percent}%`);
            }
        }
    }
}


async function tests() {
    Object.assign(log, console);
    let uploadAll = new UploadAll();
    let fakeio = { on: () => {}, emit: () => {} };
    await uploadAll.init(null, fakeio);
    console.time('filelists');
    let filelists = await uploadAll.getFileLists();
    console.timeEnd('filelists');
    console.log(`file list counts from ${MEDIA_DIR}:`);
    for (let ext of Object.keys(filelists).sort()) {
        console.log(`  ${ext} ${filelists[ext].length}`);
    }

    //let media_list = await uploadAll.listTatorFiles();
    //console.log(`current tator media list has ${media_list.length} items`);
    //console.log(JSON.stringify(media_list, null, 4));

    await uploadAll.uploadAll();

    console.log('waiting');
    setTimeout(() => console.log('done'), 10 * 1000);
}


if (require.main === module) {
    tests();
}


module.exports = UploadAll;
