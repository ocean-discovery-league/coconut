'use strict';

const WebServer = require('./web-server');
const MissionManager = require('./mission-manager');


async function main() {
    let missionManager = new MissionManager();
    await missionManager.init();
    await missionManager.start();

    let webServer = new WebServer();
    await webServer.init();
}    


main();

