'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const socketio = require('socket.io');
const UploadAll = require('./upload-all');
const MissionID = require('./mission-id');
const WiFi = require('./wifi');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
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
	app.use(serveStatic(STATIC_DIR));

	let server = http.createServer(app);
	let io = socketio(server);

	server.listen(PORT, BIND, () => {
	    log.log(`server started on port ${PORT}`);
	});

	let wifi = new WiFi();
	wifi.init(app,
		  (err) =>
		  {
                      if (err) {
			  log.error(err);
                      } else {
			  log.log('wifi listening');
                      }
		  });

	let uploadAll = new UploadAll();
	uploadAll.init(app, io);

	let missionID = new MissionID();
	missionID.init(app, io);
    }
}


module.exports = WebServer;
