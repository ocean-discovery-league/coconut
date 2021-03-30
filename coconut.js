'use strict';

const WebServer = require('./src/web-server');
const MissionManager = require('./src/mission-manager');


async function main() {
    let missionManager = new MissionManager();
    await missionManager.init();
    await missionManager.start();

    let webServer = new WebServer();
    await webServer.init();
}    


main();

