'use strict';

const os = require('os');
const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const util = require('util');
const { EventEmitter } = require('events');
const asyncHandler = require('express-async-handler');
const glob = require('readdir-glob');  // we rely on the `archive` module (in DownloadAll.js) using/depending on this

const shunt = () => {};
let log = {
    debug: shunt,
    log: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};


class MediaWatcher extends EventEmitter {
    static MEDIA_DIR =
        (os.platform() === 'darwin')
        ? (__dirname + '/../test/media')
        : '/var/www/html/media';


    async init(app, io) {
        this.io = io;
        fs.watch(MediaWatcher.MEDIA_DIR, { persistent: false, encoding: 'utf8'}, (t, f) => this.onDirChange(t, f));

        this.io.on('connection', (socket) => {
            log.log('MediaWatcher client connected');
            this.onDirChange();
        });
    }


    async onDirChange(eventType, filename) {
        log.debug('onDirChange', eventType, filename);
        if (!this.reporting_change) {
            // give it a half second
            this.reporting_change = true;
            await new Promise( (res) => setTimeout(res, 500) );
            let allfiles = await this.getAllFiles();
            let filesByGroup = this.groupFilesByType(allfiles, false);
            this.reporting_change = false;

            let fileGroupCounts = this.countFilesByGroup(filesByGroup);
            log.debug('emit uploadall/filecounts', fileGroupCounts);
            this.io.emit('uploadall/filecounts', fileGroupCounts);
        }
    }


    async getAllFiles(dirpath=MediaWatcher.MEDIA_DIR, sortthem=false, groupthem=false) {
        let directoryFiles = [];
        await new Promise( (resolve, reject) => {
            let globOptions = {
                stat: true,
                dot: true
            };

            let globber = glob(dirpath, globOptions);
            globber.on('match', (match) => {
                directoryFiles.push({ name: match.relative, size: match.stat.size });
            });
            globber.on('error', (err) => reject(err));
            globber.on('end', () => resolve(directoryFiles));
        });

        if (sortthem) {
            directoryFiles = this.sortFiles(directoryFiles);
        }

        if (groupthem) {
            let filesByGroup = this.groupFilesByType(directoryFiles);
            directoryFiles = [];
            let groupOrder = ['logs', 'images', 'videos', 'other'];
            for (let group of groupOrder) {
                if (group in filesByGroup) {
                    directoryFiles = directoryFiles.concat(filesByGroup[group]);
                }
            }
            // pickup any strays not in groupOrder list
            for (let group of Object.keys(filesByGroup)) {
                if (!(group in groupOrder)) {
                    directoryFiles = directoryFiles.concat(filesByGroup[group]);
                }
            }
        }

        return directoryFiles;
    }


    sortFiles(files) {
        let cmpFn = (a, b) => a.name.localeCompare(b.name);
        let sorted_files = files.sort(cmpFn);
        return(files);
    }


    groupFilesByType(files, includethumbs=false) {
        let filesByGroup = {
            'videos': [],
            'images': [],
            'logs':   [],
            'other':  []  // includes any h264 files
        };
        for (let f of files) {
            let group;
            let ext = path.extname(f.name);
            if (ext.startsWith('.')) {
                ext = ext.substring(1);
            }

            if (f.name.endsWith('.th.jpg') && !includethumbs) {
                continue;
            }

            if (ext === 'mp3' || f.name.endsWith('.th.jpg')) {
                group = 'videos';
            } else if (ext === 'jpg') {
                group = 'images';
            } else if (ext === 'txt' || ext === 'csv' || ext === 'tsv' || ext === 'json') {
                group = 'logs';
            } else {
                group = 'other';
            }
            filesByGroup[group].push(f);
        }
        return filesByGroup;
    }


    countFilesByGroup(filesByGroup) {
        let fileCounts = {};
        for (let group of Object.keys(filesByGroup)) {
            fileCounts[group] = filesByGroup[group].length;
        }
        return fileCounts;
    }


    groupFilesByExt(allFiles) {
        let filesByExt = {
            'jpg':  [],
            'mp4':  [],
            'h264': [],
            'txt':  [],
        };
        for (let f of allFiles) {
            if (f.name.endsWith('.th.jpg')) {  // skip the thumbnails
                continue;
            }
            let ext = path.extname(f.name);
            if (ext.startsWith('.')) {
                ext = ext.substring(1);
            }
            if (ext in filesByExt) {
                filesByExt[ext].push(f);
            }
        }
        return filesByExt;
    }


    // exactly the same as countFilesByGroup, currently
    countFilesByExt(filesByExt) {
        let filecounts = {};
        for (let ext of Object.keys(filesByExt)) {
            filecounts[ext] = filesByExt[ext].length;
        }
        return filecounts;
    }
}


async function tests() {
    Object.assign(log, console);
    let mediaWatcher = new MediaWatcher();
    let fakeio = { on: () => {}, emit: () => {} };
    await mediaWatcher.init(null, fakeio);
    console.time('getAllFiles');
    let allFiles = await mediaWatcher.getAllFiles();
    console.timeEnd('getAllFiles');
    let filesByGroup = this.groupFilesByType(allFiles);
    let filecounts = this.countFilesByGroup(filesByGroup);
    console.log(`file list counts from ${MediaWatcher.MEDIA_DIR}:`);
    for (let group of Object.keys(filecounts).sort()) {
        console.log(`  ${group} ${filecounts[group]}`);
    }

    //console.log('waiting');
    //setTimeout(() => console.log('done'), 10 * 1000);
}


if (require.main === module) {
    tests();
}


module.exports = MediaWatcher;
