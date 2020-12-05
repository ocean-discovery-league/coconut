'use strict';

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const util = require('util');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const socketio = require('socket.io');
const WiFi = require ('./wifi');
//const fetch = require('node-fetch');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
const STATIC_DIR = __dirname + '/../static';


async function init() {
    let app = express();
    app.use((req, res, next) => {
	console.log(req.method, req.url);
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
                    console.error(err);
                } else {
                    console.log('wifi listening');
                }
            });

    let server = http.createServer(app);

    server.listen(PORT, BIND, () => {
	console.log(`server started on port ${PORT}`);
    });

    //let io = new socketio(server);
}



module.exports.init = init;
