'use strict';

const { EventEmitter } = require('events');

const shunt = () => {};
let log = {
    //debug: shunt
    debug: console.debug,
    log: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};


class TransferSession extends EventEmitter {
    async init(io, res, archive) {
        this.io = io;
        this.res = res;
        this.archive = archive;

        this.canceled = false;
        this.pendingFiles = [];
        this.finishedFiles = [];
        this.pendingBytes = 0;
        this.finishedBytes = 0;
        this.dataBytes = 0;
        this.fileName = '';
        this.fileBytesTotal = 0;
        this.fileBytesDone = 0;
        this.downloadFinished = false;
        this.startTime = Date.now();
        this.finalElapsedTime = null;
    }


    addPendingFile(file) {
        this.pendingFiles.push(file);
        this.pendingBytes += file.size;
    }


    begin() {
        if (this.pendingFiles) {
            log.log('pendingFiles', this.pendingFiles);
            this.fileName = this.pendingFiles[0].name;
            this.fileBytesTotal = this.pendingFiles[0].size;
        }
        this.reportProgress();
    }

    _end() {
        this.emit('end');
    }


    cancel() {
        if (!this.canceled) {
            log.log('canceling download...');
            this.archive.abort();
            this.res.socket.destroy();
            this.res = undefined;
            this.io_emit('download/error', 'canceled');
            this.canceled = true;
            this._end();
        } else {
            log.warning(`download already canceled`);
        }
    }


    finish() {
        log.log('archive emitted finish!');
        this.fileName = '';
        this.fileBytesDone = 0;
        this.fileBytesTotal = 0;
        this.downloadFinished = true;
        this.finalElapsedTime = Date.now() - this.startTime;
        this.io_emit('download/finish');
        this._end();
    }


    error(err) {
        log.error('downloading error', err);
        if (this.res) {
            this.res = undefined;
        }
        if (this.io) {
            this.io_emit('download/error', err.message);
        }
        this._end();
    }


    warning(err) {
        if (err.code === 'ENOENT') {
            log.error('warning: file missing while archiving', err);
        } else {
            log.error('warning while archiving', err);
        }
        this.io_emit('download/warning', err.message);
    }


    data(data) {
        //log.log('data', data.length);
        this.dataBytes += data.length;
        this.fileBytesDone += data.length;
        this.reportProgress();
    }


    // entry(event) {
    //     this.reportProgress();
    //     log.log('archive entry', event);
    //     // fileName = event.name;
    //     // fileBytesTotal = event.stats.size;
    //     // fileBytesDone = 0;
    //     this.reportProgress();
    // }


    progress(event) {
        //log.log('archive progress', event);
        this.finishedFiles.push(event);
        if (this.pendingFiles.length > this.finishedFiles.length) {
            let n = this.finishedFiles.length;
            this.fileName = this.pendingFiles[n].name;
            this.fileBytesDone = 0;
            this.fileBytesTotal = this.pendingFiles[n].size;
        } else {
            this.fileName = '';
            this.fileBytesDone = 0;
            this.fileBytesTotal = 0;
        }
        this.reportProgress();
    }


    reportProgress() {
        //pendingFiles, finishedFiles, pendingBytes, finishedBytes, dataBytes, fileName, fileBytesTotal, fileBytesDone, downloadFinished, startTime, finalElapsedTime

        // let event = {
        //     pendingFiles, finishedFiles, pendingBytes, finishedBytes, dataBytes
        // };
        let event = {
            filesTotal: this.pendingFiles.length,
            filesDone: this.finishedFiles.length,
            bytesTotal: this.pendingBytes,
            bytesDone: this.dataBytes,
            fileName: this.fileName,
            fileBytesTotal: this.fileBytesTotal,
            fileBytesDone: this.fileBytesDone,
            finished: this.downloadFinished,
            elapsedTime: this.finalElapsedTime || Date.now() - this.startTime
        };
        //log.log('progress', event);
        this.io_emit('download/progress', event);
    }


    io_emit(event_name, data) {
        if (!this.canceled) {
            this.io.emit(event_name, data);
        } else {
            log.debug('io.emit prevented after cancel');
        }
    }
}


module.exports = TransferSession;
