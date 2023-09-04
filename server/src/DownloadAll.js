'use strict';

const os = require('os');
const fsP = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const glob = require('readdir-glob');  // we rely on the `archive` module depending on / using this
const { EventEmitter } = require('events');
const asyncHandler = require('express-async-handler');

const archiver = require('archiver');

const MEDIA_DIR =
      (os.platform() === 'darwin')
      ? (__dirname + '/../test/media')
      : '/var/www/html/media';

const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};


class DownloadAll extends EventEmitter {
    async init(app, io) {
        // this.downloading = false;
        // this.downloading_cancel = false;
        if (app) {
            this.addRoutes(app);
        }
        this.io = io;

        // this.io.on('connection', (socket) => {
        //     log.log('client connected');
        //     this.onDirChange();
        //     if (this.downloading) {
        //         //this.reportDownProgress();
        //     }
        // });
    }


    addRoutes(app) {
        app.get('/api/v1/download/:select/:format', asyncHandler(async (req, res) => {
            await this.download(req, res, req.params.select, req.params.format);
        }));
        app.get('/api/v1/download/:select', asyncHandler(async (req, res) => {
            await this.download(req, res, req.params.select);
        }));
        app.get('/api/v1/download', asyncHandler(async (req, res) => {
            await this.download(req, res);
        }));

        // app.post('/api/v1/download/cancel', asyncHandler(async (req, res) => {
        //     if (this.downloading) {
        //         log.log('canceling download...');
        //         this.downloading_cancel = true;
        //         archive.abort();
        //         this.downloading = false;
        //         res.end();
        //     } else {
        //         log.error(`download already canceling`);
        //         res.status(500).send('already canceling downloading');
        //     }
        // }));
    }

    async download(req, res, select='all', format='zip') {
        if (!['all','logs'].includes(select) || !['zip','tar'].includes(format)) {
            return res.status(404).end();
        }
        log.log(`download ${select} as ${format} started`);

        // let glob;
        // switch (select) {
        // case 'all':
        //     glob = false;
        //     break;
        // case 'logs':
        //     glob = MEDIA_DIR + '*.txt';
        //     break;
        // default: return res.status(404).end();
        // }

        let ext;
        let archive;
        let contentType;
        switch (format) {
        case 'zip':
            let compression = zlib.constants.Z_NO_COMPRESSION;
            if (select === 'logs') {
                compression = zlib.constants.Z_BEST_COMPRESSION;
            }
            ext = 'zip';
            archive = archiver(format, { zlib: { level: compression } });
            contentType = 'application/zip';
            break;
        case 'tar':
            ext = 'tar.gz';
            archive = archiver(format, { gzip: true });
            contentType = 'application/gzip';
            break;
        default: return res.status(404).end();
        }

        let pendingFiles = [];
        let finishedFiles = [];
        let pendingBytes = 0;
        let finishedBytes = 0;
        let dataBytes = 0;
        let fileName;
        let fileBytesTotal = 0;
        let fileBytesDone = 0;
        let downloadFinished = false;
        let startTime = date.now();
        let finalElapsedTime = null;

        function report() {
            this.reportProgress(pendingFiles, finishedFiles, pendingBytes, finishedBytes, dataBytes, fileName, fileBytesTotal, fileBytesDone, downloadFinished, startTime, finalElapsedTime);
        }

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                log.error('warning: file missing while archiving', err);
            } else {
                log.error('warning while archiving', err);
            }
            this.io.emit('downloadall/error', err.message);
        });

        archive.on('error', function(err) {
            log.error('error while archiving', err);
            this.io.emit('downloadall/error', err.message);
            throw err;
        });

        archive.on('end', () => {
            log.log(`download ${select} archive stream has ended`);
        });

        archive.on('data', (data) => {
            //log.log('data', data.length);
            dataBytes += data.length;
            fileBytesDone += data.length;
            report();
        });

        // archive.on('entry', (event) => {
        //     report();
        //     log.log('archive entry', event);
        //     // fileName = event.name;
        //     // fileBytesTotal = event.stats.size;
        //     // fileBytesDone = 0;
        //     report();
        // });

        archive.on('progress', (event) => {
            log.log('archive progress', event);
            finishedFiles.push(event);
            if (pendingFiles.length > finishedFiles.length) {
                let n = finishedFiles.length - 1;
                fileName = pendingFiles[n].name;
                fileBytesDone = 0;
                fileBytesTotal = pendingFiles[n].size;
            } else {
                fileName = '';
                fileBytesDone = 0;
                fileBytesTotal = 0;
            }
            report();
        });

        archive.on('finish', () => {
            fileName = '';
            fileBytesDone = 0;
            fileBytesTotal = 0;
            downloadFinished = true;
            finalElapsedTime = Date.now() - startTime;
        });

        let dirname = (new Date(Date.now())).toISOString();
        dirname = dirname.split('.')[0];
        dirname = dirname.replace(/[-:]/g, '');
        dirname = dirname.replace('T', '_');
        dirname = os.hostname + '_' + dirname + '_' + select;
        let filename = `${dirname}.${ext}`;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        archive.pipe(res);

        // if (glob) {
        //     archive.glob(glob, { cwd: MEDIA_DIR });
        if (select === 'all') {
            // archive.directory(MEDIA_DIR, dirname, (entry) => {
            //     log.log('adding pendingFile', entry);
            //     pendingFiles.push(entry);
            //     //pendingBytes += entry
            //     return entry;
            // });
            pendingFiles = await this.getRecursiveDirectoryList(MEDIA_DIR);
            for (let file of pendingFiles) {
                archive.file(`${MEDIA_DIR}/${file.name}`, { name: `${dirname}/${file.name}` } );
                pendingBytes += file.size;
            }
            //log.log('pendingFiles', pendingFiles);
            if (pendingFiles) {
                fileName = pendingFiles[0].name;
                fileBytesDone = 0;
                fileBytesTotal = pendingFiles[0].size;
            }
            report();
        } else {
            let filelists = await this.getFileLists();
            let filelist = [];
            if (select === 'logs') {
                filelist = filelists['txt'];
            }
            for (let filename of filelist) {
                archive.file(`${MEDIA_DIR}/${filename}`, { name: `${dirname}/${filename}` } );
            }
        }

        log.log('finalize');
        await archive.finalize();

        //return res.end();  // don't do this, this breaks downloading!
    }


    reportProgress(pendingFiles, finishedFiles, pendingBytes, finishedBytes, dataBytes, fileName, fileBytesTotal, fileBytesDone, downloadFinished, startTime, finalElapsedTime) {
        // let event = {
        //     pendingFiles, finishedFiles, pendingBytes, finishedBytes, dataBytes
        // };
        let event = {
            filesTotal: pendingFiles.length,
            filesDone: finishedFiles.length,
            bytesTotal: pendingBytes,
            bytesDone: dataBytes,
            fileName,
            fileBytesTotal,
            fileBytesDone,
            finished: downloadFinished,
            elapsedTime: finalElapsedTime || Date.now() - startTime
        };
        //log.log('progress', event);
        this.io.emit('downloadall/progress', event);
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


    async getRecursiveDirectoryList(dirpath) {
        let directoryList = [];
        return new Promise( (resolve, reject) => {
            let globOptions = {
                stat: true,
                dot: true
            };

            let globber = glob(dirpath, globOptions);
            globber.on('match', (match) => {
                directoryList.push({ name: match.relative, size: match.stat.size });
            });
            globber.on('error', (err) => reject(err));
            globber.on('end', () => resolve(directoryList));
        });
    }
}


module.exports = DownloadAll;
