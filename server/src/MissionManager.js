'use strict';

const RingInput = require('./RingInput.js');
const SensorInput = require('./SensorInput.js');
const MissionEngine = require('./MissionEngine.js');
const MissionId = require('./MissionID.js');

let log = console;


class MissionManager {
    async init(missionPrograms) {
            this.missionPrograms = missionPrograms;
            this.ringInput = new RingInput();
            await this.ringInput.init();
    }


    async start(missionName, filename, speedFactor) {
            if (!missionName) {
                this.ringInput.on('change', () => this.ringChangeHandler());
                filename = this.ringInput.getSensorLogFilename();
                if (filename) {  // we should already be running
                        this.beginMission();
                }
            } else {
                this.beginMission(missionName, filename, speedFactor);
            }
    }

    async ringChangeHandler() {
            let [new_modenum, new_filename] = this.ringInput.parseStatus();
            if ((new_modenum !== this.modenum) || (new_filename !== this.filename)) {
                await this.stopMission();
            }
            if (new_filename) {
                await this.beginMission();
            }
    }


    async beginMission(missionName, filename, speedFactor) {
            if (!missionName) {
                let modenum = this.ringInput.getModenum();
                let filename = this.ringInput.getSensorLogFilename();
                if (filename) {
                        this.filename = filename;
                        this.modenum = modenum;
                        this.sensorInput = new SensorInput();
                        let missionId = new MissionId();
                        missionId.writeMissionIdMarkerFile(this.filename);  // no need to await
                        await this.sensorInput.init(this.filename);
                        await this.sensorInput.start(this.filename);

                        let name = `ring${this.modenum}`;
                        let mission = await this.missionPrograms.load(name);
                        if (!mission) {
                            await this.stopMission();
                            throw new Error('mission ${name} not found!');
                        }
                        this.missionEngine = new MissionEngine();
                        await this.missionEngine.init();
                        await this.missionEngine.start(mission, this.sensorInput.sensors);
                } else {
                        log.error('no sensor filename specified, not beginning mission');
                }
            } else {
                this.filename = filename;
                this.sensorInput = new SensorInput();
                await this.sensorInput.init();
                await this.sensorInput.start(this.filename, true, speedFactor);
                let mission = await this.missionPrograms.load(missionName);
                if (!mission) {
                        await this.stopMission();
                        throw new Error('mission ${missionName} not found!');
                }
                this.missionEngine = new MissionEngine();
                await this.missionEngine.init();
                await this.missionEngine.start(mission, this.sensorInput.sensors);
            }
    }


    async stopMission() {
            if (this.missionEngine) {
                log.log('stopping current mission');
                await this.missionEngine.stop()
                delete this.missionEngine;
            }
            if (this.sensorInput) {
                this.sensorInput.stop();
                delete this.sensorInput;
            }
            delete this.filename;
            delete this.modenum;
    }
}


async function tests() {
    log = console;
    let name = process.argv[2] || 'mission1';
    let filename = process.argv[3] || '../test/MKN0002_M1_2021_02_22_17_03_57.423.txt';
    const MissionPrograms = require('./MissionPrograms');
    let missionPrograms = new MissionPrograms();
    await missionPrograms.init();

    if (await missionPrograms.load(name)) {
            let missionManager = new MissionManager();
            await missionManager.init(missionPrograms);
            await missionManager.start(name, filename, 30.0);
    } else {
            log.error(`unknown mission name ${name}`);
            //log.error(`available missions: ${Object.keys(missions).sort().join(' ')}`);
    }
}


if (require.main === module) {
    tests();
}


module.exports = MissionManager;
