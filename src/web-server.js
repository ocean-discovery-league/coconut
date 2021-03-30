'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
//const socketio = require('socket.io');
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

	let server = http.createServer(app);

	server.listen(PORT, BIND, () => {
	    log.log(`server started on port ${PORT}`);
	});

	//let io = new socketio(server);
    }
}


module.exports = WebServer;
