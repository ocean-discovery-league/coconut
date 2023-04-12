'use strict';

const os = require('os');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const socketio = require('socket.io');
const cors = require('cors');
const DownloadAll = require('./download-all.js');
const UploadAll = require('./upload-all.js');
const MissionID = require('./mission-id.js');
const WiFi = require('./wifi.js');

const PORT = 6252;
//const BIND = '127.0.0.1';
const BIND = '0.0.0.0';
const CLIENT_DIR = __dirname + '/../../client/build';
const STATIC_DIR = __dirname + '/../static';

let log = console;


class WebServer {
    async init(missionPrograms) {
        let app = express();
        app.use((req, res, next) => {
            log.log(req.method, req.url);
            next();
        });

	app.use(cors({origin: '*'}));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

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

        missionPrograms.addRoutes(app, io);

        let downloadAll = new DownloadAll();
        downloadAll.init(app, io);

        let uploadAll = new UploadAll();
        uploadAll.init(app, io);

        let missionID = new MissionID();
        await missionID.init(app, io);

	let fs = require('fs');
	let fsP = require('fs').promises;
	let CAM_FILENAME = '/dev/shm/mjpeg/cam.jpg';
	async function send_image_via_socket() {
	    let imagedata = await fsP.readFile(CAM_FILENAME);
	    io.emit('cam.jpg', imagedata);
	    setTimeout(send_image_via_socket, 1000/25);
	    console.log('send_image_via_socket');
	}
	send_image_via_socket();

	app.get('/cam.jpg', async (req, res) => {
	    res.setHeader('Content-Type', 'image/jpeg');
	    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0');
	    res.setHeader('Pragma', 'no-cache');
	    let boundry = '--oneframeatatime';
	    res.setHeader('Content-Type', `multipart/x-mixed-replace; boundary="${boundry}"`);
	    res.setHeader('Connection', 'close');
	    async function send_image() {
		let imagedata = await fsP.readFile(CAM_FILENAME);
		//res.write(imagedata);
		
		//res.write('--' + multipart + '\r\n', 'ascii');
		res.write(boundry+'\r\n');
		res.write('Content-Type: image/jpeg\r\n');
		res.write('Content-Length: ' + imagedata.length + '\r\n');
		res.write('\r\n');
		res.write(imagedata);
		res.write('\r\n');

		setTimeout(send_image, 1000/25);
	    }
	    send_image();
            //fs.watch(CAM_FILENAME, { persistent: false, encoding: 'utf8'}, async (t, f) => {
	    //	console.log('t', t);
	    //	imagedata = await fsP.readFile(CAM_FILENAME);
	    //	res.write(imagedata);
	    //});
	    //res.end();
	});

      if (os.platform() === 'darwin') {
	  const { createProxyMiddleware } = require('http-proxy-middleware');
          app.get('*', createProxyMiddleware({ target: 'http://localhost:3000', ws: true, changeOrigin: true }));
	  app.use(serveStatic(STATIC_DIR));
	} else {
          app.use(serveStatic(CLIENT_DIR));
	}
    }
}


module.exports = WebServer;
