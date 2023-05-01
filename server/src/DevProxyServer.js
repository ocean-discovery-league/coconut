'use strict';

const os = require('os');
const http = require('http');
const express = require('express');
const serveStatic = require('serve-static');
const cors = require('cors');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
//const CLIENT_DIR = __dirname + '/../../client/build';
const STATIC_DIR = __dirname + '/../static';

let log = console;


class DevProxyServer {
    async init() {
        let app = express();
        app.use((req, res, next) => {
            log.log(req.method, req.url);
            next();
        });

        app.use(cors({origin: '*'}));

        let server = http.createServer(app);

        server.listen(PORT, BIND, () => {
            log.log(`proxy server started on port ${PORT}`);
        });
        server.setTimeout(99999 * 1000);

        const { createProxyMiddleware } = require('http-proxy-middleware');

        let clientProxyAddress = process.env.CLIENT_PROXY_ADDRESS || 'http://localhost:5173';
        let serverProxyAddress = process.env.MAKANIU_PROXY_ADDRESS;

        if (!serverProxyAddress) {
            throw new Error('MAKANIU_PROXY_ADDRESS environment variable required!');
        }

        console.warn(`running in dev proxy server mode!`);
        console.warn(`using MAKANIU_PROXY_ADDRESS ${serverProxyAddress} for server api calls`);

        let server_routes = [
            // '/api/*',
            //'/socket.io/*',
            "/my-custom-path*",
            // '/html/*',  // the rasp cam pi web php media manager thing
            // '/b'        // bookmark setup convenience
        ];
        app.use(server_routes, createProxyMiddleware(
            { target: serverProxyAddress,
              ws: true,
              changeOrigin: true,  // needed?
              onProxyReqWs: (proxyReq, req, socket) => {
                  socket.on('error', (error) => {
                      console.warn('Websocket eror.', error.message);
                  });
              }
            }));

        app.use(createProxyMiddleware(
            { target: clientProxyAddress,
              ws: true,
              changeOrigin: true,  // needed?
              onProxyReqWs: (proxyReq, req, socket) => {
                  socket.on('error', (error) => {
                      console.warn('Websocket errror.', error.message);
                  });
              }
            }));

        // const CLIENT_DIR = __dirname + '/../../client/build';
        // app.use(serveStatic(CLIENT_DIR));


        app.use(serveStatic(STATIC_DIR));
    }
}


module.exports = DevProxyServer;
