'use strict';

const os = require('os');
const http = require('http');
const cors = require('cors');
const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const socketio = require('socket.io');
require('express-async-error');

const DownloadAll = require('./DownloadAll.js');
const UploadAll = require('./UploadAll.js');
const MissionID = require('./MissionID.js');
const WiFi = require('./WiFi.js');
const Bluetooth = require('./Bluetooth.js');
const Rover = require('./Rover.js');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
const CLIENT_DIR = __dirname + '/../../client/build';
const STATIC_DIR = __dirname + '/../static';

let log = console;


class WebServer {
    async init(bluetooth, missionPrograms, ringInput) {
        let app = express();
        app.use((req, res, next) => {
            log.log(req.method, req.url);
            next();
        });

        app.use(cors({origin: '*'}));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        let server = http.createServer(app);
        let io = new socketio.Server(server, { cors:{origin: '*'}, /*maxHttpBufferSize: 1e8*/ });

        server.listen(PORT, BIND, () => {
            log.log(`server started on port ${PORT}`);
        });
        server.setTimeout(99999 * 1000);

        let wifi = new WiFi();
        await wifi.init(app, io).catch(log.error);

        bluetooth.addWebAPI(app, io);

	ringInput.addRoutes(app);
	ringInput.addSocketIOHandlers(io);

        missionPrograms.addRoutes(app, io);

        let downloadAll = new DownloadAll();
        downloadAll.init(app, io);

        let uploadAll = new UploadAll();
        uploadAll.init(app, io);

        let missionID = new MissionID();
        await missionID.init(app, io);

        let rover = new Rover();
        await rover.init(app, io, wifi, bluetooth);

        app.get('/b', asyncHandler(async (req, res) => {
            log.log('making bookmark');
            let text = await this.getBookmarkDataURL();
            res.setHeader('Content-Type', 'text/plain');
            res.end(text);
        }));

        app.use(serveStatic(CLIENT_DIR));
    }


    async getBookmarkDataURL() {
        let html = await fsP.readFile(STATIC_DIR + '/ping.html', 'utf8');
        let buffer = Buffer.from(html, 'utf8');
        let base64 = buffer.toString('base64');
        //log.log('base64', base64);
        return `data:text/html;base64,${base64}`;
    }
}


module.exports = WebServer;
