'use strict';

const log = console;

class DevFakePreview {
    async init() {
    }


    addWebAPI(app, io) {
        this.io = io;
        this.addRoutes(app);
        this.addSocketIOHandlers(io);
    }


    addRoutes(app) {
        app.get('/html/preview.php', (req, res) => {
            res.end('<!doctype html><html><head><title>fake preview</title></head><body>fake preview</body></html>');
        });
    }


    addSocketIOHandlers(io) {
    }
}


async function main() {
    log.log('start');
    let devFakePreview = new devFakePreview();
    await devFakePreview.init();
}


if (require.main === module) {
    main();
}


module.exports = DevFakePreview;
