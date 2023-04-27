'use strict';

const os = require('os');
const WebServer = require('./web-server');
const MissionManager = require('./mission-manager');
const MissionPrograms = require('./mission-programs');
const DevProxyServer = require('./DevProxyServer.js');


async function main() {
    if (os.platform === 'linux') {
        let missionPrograms = new MissionPrograms();
        await missionPrograms.init();

        let missionManager = new MissionManager();
        await missionManager.init(missionPrograms);
        await missionManager.start();

        let webServer = new WebServer();
        await webServer.init(missionPrograms);
    } else {
        let devProxyServer = new DevProxyServer();
        await devProxyServer.init();
    }
}


main();

