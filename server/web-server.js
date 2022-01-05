'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const { createProxyMiddleware } = require('http-proxy-middleware');
const socketio = require('socket.io');
const UploadAll = require('./upload-all.js');
const MissionID = require('./mission-id.js');
const WiFi = require('./wifi.js');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
const CLIENT_DIR = __dirname + '/../client/build';
const STATIC_DIR = __dirname + '/../static';

let log = console;


class WebServer {
    async init() {
        let app = express();
        app.use((req, res, next) => {
            log.log(req.method, req.url);
            next();
        });

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(serveStatic(CLIENT_DIR));
        app.use(serveStatic(STATIC_DIR));

        let server = http.createServer(app);
        let io = socketio(server);

        server.listen(PORT, BIND, () => {
            log.log(`server started on port ${PORT}`);
        });
        server.setTimeout(99999 * 1000);

        let wifi = new WiFi();
        wifi.init(app, (err) => {
            if (err) {
                log.error(err);
            } else {
                log.log('wifi listening');
            }
        });

        let uploadAll = new UploadAll();
        uploadAll.init(app, io);

        let missionID = new MissionID();
        await missionID.init(app, io);

        //app.get('*', createProxyMiddleware({ target: 'http://localhost:3000', ws: true, changeOrigin: true }));
    }
}


module.exports = WebServer;
