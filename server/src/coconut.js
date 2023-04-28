'use strict';

const os = require('os');
const WebServer = require('./WebServer');
const MissionManager = require('./MissionManager');
const MissionPrograms = require('./MissionPrograms');


async function main() {
    if (os.platform() === 'linux') {
        let missionPrograms = new MissionPrograms();
        await missionPrograms.init();

        let missionManager = new MissionManager();
        await missionManager.init(missionPrograms);
        await missionManager.start();

        let webServer = new WebServer();
        await webServer.init(missionPrograms);
    } else {
	const DevProxyServer = require('./DevProxyServer.js');
        let devProxyServer = new DevProxyServer();
        await devProxyServer.init();
    }
}


main();
