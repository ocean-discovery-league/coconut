'use strict';

const os = require('os');
const WebServer = require('./WebServer.js');
const Bluetooth = require('./Bluetooth.js');
const RingInput = require('./RingInput.js');
const MissionManager = require('./MissionManager');
const MissionPrograms = require('./MissionPrograms');


async function main() {
    if (os.platform() === 'linux') {
        let ringInput = new RingInput();
        await ringInput.init();

	let bluetooth = new Bluetooth()
	await bluetooth.init(ringInput);

        let missionPrograms = new MissionPrograms();
        await missionPrograms.init();

        let missionManager = new MissionManager();
        await missionManager.init(missionPrograms, ringInput);
        await missionManager.start();

        let webServer = new WebServer();
        await webServer.init(bluetooth, missionPrograms, ringInput);
    } else {
	const DevProxyServer = require('./DevProxyServer.js');
        let devProxyServer = new DevProxyServer();
        await devProxyServer.init();
    }
}


main();
