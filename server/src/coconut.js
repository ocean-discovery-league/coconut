'use strict';

const os = require('os');
const WebServer = require('./WebServer.js');
const Bluetooth = require('./Bluetooth.js');
const RingInput = require('./RingInput.js');
const MissionManager = require('./MissionManager');
const MissionPrograms = require('./MissionPrograms');
const SensorLogManager = require('./SensorLogManager.js');
const { MediaWatcher } = require('./MediaWatcher.js');


async function main() {
    if (os.platform() === 'linux') {
        let ringInput = new RingInput();
        await ringInput.init();

        let bluetooth = new Bluetooth();
        await bluetooth.init(ringInput);

        let missionPrograms = new MissionPrograms();
        await missionPrograms.init();

        let missionManager = new MissionManager();
        await missionManager.init(missionPrograms, ringInput);
        await missionManager.start();

        let mediaWatcher = new MediaWatcher();
        let sensorLogManager = new SensorLogManager();
        await sensorLogManager.init(ringInput, mediaWatcher);
        await sensorLogManager.createMissingCSVs();
        await sensorLogManager.start();

        let webServer = new WebServer();
        await webServer.init(bluetooth, missionPrograms, ringInput, mediaWatcher);
    } else {
        if (process.env.MAKANIU_PROXY_ADDRESS === 'localhost') {
            let ringInput = new RingInput();
            await ringInput.init();

            let bluetooth = new Bluetooth();
            await bluetooth.init(ringInput);

            let missionPrograms = new MissionPrograms();
            await missionPrograms.init();

            let missionManager = new MissionManager();
            await missionManager.init(missionPrograms, ringInput);
            await missionManager.start();

            let mediaWatcher = new MediaWatcher();
            let sensorLogManager = new SensorLogManager();
            await sensorLogManager.init(ringInput, mediaWatcher);
            await sensorLogManager.createMissingCSVs();
            await sensorLogManager.start();

            const DevFakePreview = require('./DevFakePreview.js');
            let devFakePreview = new DevFakePreview();
            await devFakePreview.init();

            let webServer = new WebServer();
            await webServer.init(bluetooth, missionPrograms, ringInput, mediaWatcher, 6253, devFakePreview);
        }

        const DevProxyServer = require('./DevProxyServer.js');
        let devProxyServer = new DevProxyServer();
        await devProxyServer.init();
    }
}


main();
