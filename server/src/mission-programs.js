'use strict';

const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');


class MissionPrograms {
    constructor() {
      this.missions = {};
      this.dir = path.resolve(`${__dirname}/../missions`);
    }


  async init() {
    let filenames = fs.readdirSync(this.dir);
    for (let filename of filenames) {
      if (!filename.endsWith('.js')) {
	continue;
      }
      // if (filename === 'index.js') {
      // 	continue;
      // }

      let name = path.basename(filename, '.js');
      let mission = await this.load(name);
    }
  }


  syncDiagramFromMissionParams(mission) {
    let nodes = mission.diagram[0];
    for (let node of nodes) {
      if (!node.param) {
	continue;
      }
      if (node.param in mission.params) {
	node.value = mission.params[node.param];
      }
      let edit_units_param_name = node.param + '_EDIT_UNITS';
      if (edit_units_param_name in mission.params) {
	node.edit_units = mission.params[edit_units_param_name];
      }
    }
  }


  get(name) {
    return this.missions[name];
  }


  async load(name) {
    let mission;
    let filename = `${this.dir}/${name}.js`;
    try {
      delete require.cache[require.resolve(filename)];
      mission = require(filename);
    } catch(err) {
      console.error(`could not load mission ${filename}`);
      console.error(err);
    }
    if (!mission) {
      return;
    }

    let paramsfilename = `${this.dir}/${name}-params.json`;
    try {
      let json = await fsP.readFile(paramsfilename);
      let newparams = JSON.parse(json);
      let defaultparams = mission.params;
      let params = {...defaultparams, ...newparams};  // merge the two objects
      mission.params = params;
      this.syncDiagramFromMissionParams(mission);
    } catch(err) {
      if (err.code !== 'ENOENT') {
	console.error(`error reading mission params file ${paramsfilename}`, err);
      }
    }

    this.missions[name] = mission;
    return mission;
  }


    addRoutes(app, io) {
	app.get('/mission/diagram/:name', async (req, res) => {
	    try {
		let mission = await this.load(req.params.name);
		if (mission && mission.diagram) {
		    let json = JSON.stringify(mission.diagram);
		    res.setHeader('Content-Type', 'application/json');
		    res.end(json);
		} else {
		    res.status(404);
		    res.end();
		}
	    } catch(err) {
		console.error('get missionid error', err);
		res.status(500).send(err.message);
	    }
	});

      io.on('connect', (socket) => {
	console.log('connect (mission-programs)');
	socket.on('updateparam', async (data) => {
	  let mission_name = data.programid;
	  let mission = this.missions[mission_name];
	  if (mission) {
	    let edit_units = false;
	    if (data.name.endsWith('_EDIT_UNITS')) {
	      let param_name = data.name.substr(0, data.name.lastIndexOf('_EDIT_UNITS'));
	      if (param_name in mission.params) {
		edit_units = true;
	      }
	    }
	    if (data.name in mission.params || edit_units) {
	      mission.params[data.name] = data.value;
	      let paramsfilename = `${this.dir}/${mission_name}-params.json`;
	      try {
		let json = JSON.stringify(mission.params, null, 4) + '\n';
		console.log('+ writing params file');
		await fsP.writeFile(paramsfilename, json, 'utf8');
		console.log('- done writing params');
		this.syncDiagramFromMissionParams(mission);
	      } catch(err) {
		console.error('error writing params file', paramsfilename, err);
	      }
	    } else {
	      console.error('unknown param name', data.name, 'for programid', data.programid);
	    }
	  } else {
	    console.error('unknown programid', data.programid);
	  }
	});
	// socket.on('message', (data) => {
	//   console.log('message', data);
	// });
      });
    }
}


async function tests() {
    let missionPrograms = new MissionPrograms
    await missionPrograms.init();
    let mission_names = Object.keys(missionPrograms.missions).sort();
    console.log(`${mission_names.length} missions found and loaded:`);
    for (let mission_name of mission_names) {
	console.log(`  ${mission_name}`);
    }
}

if (require.main === module) {
    tests();
}


module.exports = MissionPrograms;
