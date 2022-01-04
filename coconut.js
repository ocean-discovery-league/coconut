'use strict';

import WebServer from './src/web-server.cjs';
import MissionManager from './src/mission-manager.cjs';


async function main() {
    let missionManager = new MissionManager();
    await missionManager.init();
    await missionManager.start();

    let webServer = new WebServer();
    await webServer.init();
}    


main();

