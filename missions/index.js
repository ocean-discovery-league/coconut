'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');


let missions = {};

function scanForMissions() {
    let filenames = fs.readdirSync(__dirname);
    for (let filename of filenames) {
	if (!filename.endsWith('.js')) {
	    continue;
	}
	if (filename === 'index.js') {
	    continue;
	}

	let mission_name = path.basename(filename, '.js');
	try {
	    missions[mission_name] = require('./' + mission_name);
	} catch(err) {
	    console.error(`could not load mission ${__dirname+'/'+mission_name+'.js'}`);
	    console.error(err);
	}
    }
}


scanForMissions();


if (require.main === module) {
    let mission_names = Object.keys(missions).sort();
    console.log(`${mission_names.length} missions found and loaded:`);
    for (let mission_name of mission_names) {
	console.log(`  ${mission_name}`);
    }
}
    

module.exports = missions;
