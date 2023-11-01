'use strict';

const os = require('os');
const fsP = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { EventEmitter } = require('events');
const asyncHandler = require('express-async-handler');
const archiver = require('archiver');

const { MEDIA_DIR } = require('./MediaWatcher.js');
const TransferSession = require('./TransferSession.js');

const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};


class DownloadAll extends EventEmitter {
    async init(app, io, mediaWatcher) {
        this.mediaWatcher = mediaWatcher;
        this.session = undefined;
        if (app) {
            this.addRoutes(app);
        }
        this.io = io;
    }


    addRoutes(app) {
        app.get(['/api/v1/download',
                 '/api/v1/download/:selection',
                 '/api/v1/download/:selection/:format'],
                asyncHandler(async (req, res) =>
        {
            if (!this.session) {
                let selection = req.params.selection || 'all';
                let format = req.params.format || 'zip';
                let validSelections = ['all', 'log', 'photo', 'video', 'other'];
                let validFormats = ['zip', 'tar'];

                selection = selection.toLowerCase();
                format = format.toLowerCase();
                if (!validSelections.includes(selection) ||
                    (!validFormats.includes(format)))
                {
                    res.status(404).end();
                    return;
                }

                this.session = new TransferSession();
                this.session.on('end', () => {
                    this.session = undefined;
                });

                try {
                    await this.startDownload(this.session, res, selection, format);
                } catch(err) {
                    this.session.error(err);
                    throw err;
                }
                //return res.end();  // don't do this, this breaks downloading!
            } else {
                log.error('downloading already in progress');
                res.status(409).end('downloading already in progress');
            }
        }));

        app.post('/api/v1/download/cancel', asyncHandler(async (req, res) => {
            if (this.session) {
                this.session.cancel();
                res.end('download canceled');
            } else {
                log.error(`no download to cancel`);
                res.status(500).end('no download to cancel');
            }
        }));
    }

    async startDownload(session, res, selection='all', format='zip') {
        log.log(`download ${selection} as ${format} started`);

        let ext;
        let archive;
        let contentType;
        switch (format) {
        case 'zip':
            let compression = zlib.constants.Z_NO_COMPRESSION;
            if (selection === 'log') {
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
        default: throw new Error('bad format type');
        }

        let dirname = (new Date(Date.now())).toISOString();
        dirname = dirname.split('.')[0];
        dirname = dirname.replace(/[-:]/g, '');
        dirname = dirname.replace('T', '_');
        dirname = os.hostname + '_' + dirname + '_' + selection;
        let filename = `${dirname}.${ext}`;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Connection', 'close');
        archive.pipe(res);
        res.on('error', () => { archive.abort(); });

        await session.init(this.io, res, archive);

        archive.on('warning', (err) => session.warning(err));
        archive.on('error', (err) => session.error(err));
        archive.on('data', (event) => session.data(event));
        // archive.on('entry', (event) => session.entry(event);
        archive.on('progress', (event) => session.progress(event));
        archive.on('finish', () => session.finish());
        archive.on('end', () => {
            log.log(`download ${selection} archive stream has ended`);
        });

        let allMediaFiles = await this.mediaWatcher.getAllFiles(undefined, true, true);

        let pendingFiles = [];
        if (selection === 'all') {
            pendingFiles = allMediaFiles;
        } else {
            let filesByGroup = this.mediaWatcher.groupFilesByType(allMediaFiles);
            pendingFiles = filesByGroup[selection];
        }

        for (let file of pendingFiles) {
            archive.file(`${MEDIA_DIR}/${file.name}`, { name: `${dirname}/${file.name}` } );
            session.addPendingFile(file);
        }

        session.begin();
        await archive.finalize();
    }
}


module.exports = DownloadAll;
