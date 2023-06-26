'use strict';

const os = require('os');
const fsP = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
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

        let glob;
        switch (select) {
        case 'all':
            glob = false;
            break;
        case 'logs':
            glob = MEDIA_DIR + '*.txt';
            break;
        default: return res.status(404).end();
        }

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

        archive.on('progress', (event) => {
            log.log('downloadprogress', event);
            this.io.emit('downloadall/progress', event);
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
            archive.directory(MEDIA_DIR, dirname);
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

        log.log('res.end');
        return res.end();
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
}


module.exports = DownloadAll;
