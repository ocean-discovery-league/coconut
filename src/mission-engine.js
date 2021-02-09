'use strict';

const MissionState = undefined;
const MissionEvents = undefined;
const MissionActions = undefined;

global.window = {};
require('../static/mission-programs.js');
const missionPrograms = window.missionPrograms;


class MissionEngine {
    async init() {
    }

    async loadProgram(name) {
	this.program_name = name;
	this.program = missionPrograms[name];
	if (!this.program) { throw new Error(`mission name ${name} not found`); }
	console.log(`loaded mission name ${this.program_name}`);
	console.log(this.program_name, this.program);
    }
    
}


    
	


module.exports = MissionEngine;
