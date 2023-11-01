'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const asyncHandler = require('express-async-handler');

const { MediaWatcher, MEDIA_DIR } = require('./MediaWatcher.js');

const TATOR_UPLOAD_SCRIPT =
      (os.platform() === 'darwin')
      ? (__dirname + '/../test/FakeTatorUpload.py')
      : (__dirname + '/../../scripts/TatorUpload.py');

const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};


class UploadAll extends EventEmitter {
    async init(app, io, mediaWatcher) {
        this.io = io;
        this.mediaWatcher = mediaWatcher;
        this.uploading = false;
        this.uploading_cancel = false;
        if (app) {
            this.addRoutes(app);
        }
        this.io.on('connection', (socket) => {
            log.log('client connected');
            if (this.uploading) {
                this.reportUploadProgress();
            }
        });
    }


    addRoutes(app) {
        app.post('/api/v1/uploadall', asyncHandler(async (req, res) => {
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
                    this.io.emit('uploadall/finished', text);
                    log.log('uploadall finished');
                } catch(err) {
                    log.error('uploadall error', err);
                    res.status(500).send(err.message);
                    this.io.emit('uploadall/error', err.message);
                    log.log('uploadall finished with error');
                }
                this.uploading = false;
            } else {
                log.error(`uploadall already uploading`);
                res.status(500).send('already uploading');
            }
        }));

        app.post('/api/v1/uploadall/cancel', asyncHandler(async (req, res) => {
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
        }));
    }


    async uploadAll() {
        let allFiles = await this.mediaWatcher.getAllFiles();
        this.filesByExt = this.mediaWatcher.groupFilesByExt(allFiles);
        this.countsByExt = this.mediaWatcher.countFilesByExt(this.filesByExt);
        this.io.emit('uploadall/started', { filecounts: this.countsByExt });

        // ordered from smallest to largest: txt (logs), jpg (images), mp4 (videos)
        let file_ext_type_ids = [
            { ext: 'txt', type_id: 1, attach: true},  // type_id is ignored for attachments
            { ext: 'jpg', type_id: 120 },
            { ext: 'mp4', type_id: 28 },
        ];

        let total_files_count = 0;
        for (let { ext, type_id, attach } of file_ext_type_ids) {
            if (ext in this.filesByExt) {
                total_files_count += this.filesByExt[ext].length;
            }
        }
        log.log('total_files_count', total_files_count);

        // if (total_files_count === 0) {
        // }

        log.info('fetching list of existing tator media files');
        let tator_file_list = await this.listTatorFiles();
        log.info(`current tator media list has ${tator_file_list.length} items`);

        this.uploaded_bytes = 0;
        this.total_upload_bytes = 0;
        this.duplicate_count = 0;
        for (let { ext, type_id, attach } of file_ext_type_ids) {
            if (ext in this.filesByExt) {
                let filelist = this.filesByExt[ext];
                filelist = filelist.filter( file => !tator_file_list.includes(file.name) );
                this.duplicate_count += this.filesByExt[ext].length - filelist.length;
                for (let file of filelist) {
                    this.total_upload_bytes += file.size;
                }
            }
        }
        log.info(`skipping ${this.duplicate_count} files that have already been uploaded`);
        log.info(`uploading ${this.total_upload_bytes} bytes from ${total_files_count} files`);

        let media_id;
        for (let { ext, type_id, attach } of file_ext_type_ids) {
            if (ext in this.filesByExt) {
                log.log(`uploading ${this.filesByExt[ext].length} ${ext}s with type_id ${type_id}`);
                if (attach) {
                    if (!media_id) {
                        // quick and dirty hack to just have something stable to attach txt files to
                        log.info('uploading placard image for attaching files to');
                        media_id = await this.createMediaId();
                    }
                    await this.uploadList(this.filesByExt[ext], ext, type_id, media_id);
                } else {
                    await this.uploadList(this.filesByExt[ext], ext, type_id);
                }
            }
        }
    }


    async createMediaId() {
        this.tator_media_id = false;
        await this.uploadOneFile(__dirname + '/../static/tatorfile.jpg', 120);
        let media_id;
        if (this.tator_media_id) {
            media_id = this.tator_media_id;
            delete this.tator_media_id;
            log.log('got the media_id!', media_id);
        }
        return media_id;
    }


    async uploadList(filelist, ext, type_id='28', media_id=false) {
        let n=0;
        let sorted_filelist = this.mediaWatcher.sortFiles(filelist);
        for (let file of sorted_filelist) {
            if (!this.uploading_cancel) {
                let filename = `${MEDIA_DIR}/${file.name}`;
                log.log('uploading', filename);
                this.reportUploadProgress(n, filelist, ext);
                await this.uploadOneFile(filename, type_id, media_id);
                n+=1;
                this.reportUploadProgress(n, filelist, ext);
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


    reportUploadProgress(n, filelist, ext) {
        if (n !== undefined) {
            let of = filelist.length;
            this.lastProgressUpdate = { n, of, ext, filecounts: this.countsByExt };
        }
        if (this.lastProgressUpdate) {
            this.io.emit('uploadall/progress', this.lastProgressUpdate);
        }
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
                                this.tator_media_id = data.id;
                                log.log('spotted the media id!', this.tator_media_id);
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
