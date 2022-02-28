'use strict';

const WebServer = require('./web-server');
const MissionManager = require('./mission-manager');
const MissionPrograms = require('./mission-programs');


async function main() {
    let missionPrograms = new MissionPrograms();
    await missionPrograms.init();

    let missionManager = new MissionManager();
    await missionManager.init(missionPrograms);
    await missionManager.start();

    let webServer = new WebServer();
    await webServer.init(missionPrograms);
}


main();

