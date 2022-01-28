'use strict';

///
/// mission2.js
///

/// this mission waits until GPS lock has been lost, and then takes
/// pictures every 5 seconds until GPS lock is regained

let params = {
    TIME_LAPSE_CYCLE: 600  // in 1/10s,  600 = take picture every 60 secs
};


function mission2(current_phase, cycle_num, elapsed, action_elapsed, monoclock, sensors) {
    let new_action;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1 - wait until the GPS loses lock (goes underwater)
    ///
    if (current_phase === 1) {
	let gps_state;
	if (sensors.GNSS) {
	    gps_state = sensors.GNSS.getIsLocked(monoclock);
	}
	if (gps_state === true || gps_state === undefined) {
	    new_action = 'WAIT';
	} else {
	    new_phase = current_phase + 1;
	}
    }

    ///
    /// Phase 2 - underwater, do time lapse photos
    ///
    if (current_phase === 2) {
	new_action = 'TIME_LAPSE';
	options = {
	    cycle: params.TIME_LAPSE_CYCLE
	};

	if (sensors.GNSS && sensors.GNSS.getIsLocked(monoclock)) {
	    new_phase = -1;  // end mission
	}
    }

    return [new_action, new_phase, options];
}


const diagram = [
    [ // node data
        // { key: "Phase0", text: "Start", isGroup: true, category: "Pool" },
        // { key: "Action0-1", text: "start", isGroup: true, group: "Phase0", color: "#FDF3CD" },
        // { key: "Block0-1-1", text: " If Collar @ M2 ", group: "Action0-1", color: "#FDF3CD" },
        // { key: "Block0-1-2", text: " Start Mission ", group: "Action0-1", color: "#FBDB6B" },

        { key: "Phase1", text: "Wait", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "no GPS", isGroup: true, group: "Phase1", color: "#D2E0E3" },
        { key: "Block1-1-1", text: " Start ", group: "Action1-1", color: "#FBDB6B" },
        { key: "Block1-1-2", text: "If No GPS Signal" , group: "Action1-1", color: "#D2E0E3" },

        { key: "Phase2", text: "Record", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "#D2E0E3" },
        { key: "Block2-1-1", text: "Timelapse Photos", group: "Action2-1", color: "#D2E0E3" },
        { key: "Block2-1-2", text: "{}", group: "Action2-1", color: "#7BA5AF",
	  param: "TIME_LAPSE_CYCLE",
	  value: 600,
	  default: 600,
	  type: "interval",
	  units: "decisecond",
	  edit_units: "seconds",
	  template: "Every {x} {abbr}{s}",
	  editing: {
	    options: {
	      second: {
		rank: 1,
		scale: 10,
		step: 0.1,
		range: {low: 0.1, high: 90},
		label: 'seconds',
		abbr: 'sec'
	      },
	      minute: {
		rank: 2,
		scale: 600,
		step: 1,
		range: {low: 1, high: 120},
		label: 'minutes',
		abbr: 'min'
	      },
	      hour: {
		rank: 3,
		scale: 36000,
		step: 1,
		range: {low: 1, high: 48},
		label: 'hours'
	      }
	    },
	  },
	},
        { key: "Phase3", text: "End", isGroup: true, category: "Pool" },
        { key: "Action3-1", text: "end", isGroup: true, group: "Phase3", color: "#FAE6CE" },
        { key: "Block3-1-1", text: "End ", group: "Action3-1", color: "#F1B36F" },
      { key: "Block3-1-2", text: "If GPS Signal", group: "Action3-1", color: "#FAE6CE",
      	  param: "DEPTH_END_MISSION_METERS",
	  value: 2,
	  default: 2,
	  type: "interval",
	  units: "meters",
	  label: "meter{s}",
	  abbr: "m",
	  template: "If depth < {x}{abbr}",
	  range: {
	    low: 1,
	    high: 1500
	  },
      },
    ],
    [ // link data
        { from: "Block0-1-1", to: "Block0-1-2" },
        { from: "Phase0", to: "Phase1" },

        { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Phase1", to: "Phase2" },

        { from: "Block2-1-1", to: "Block2-1-2" },
        { from: "Phase2", to: "Phase3" },

        { from: "Block3-1-1", to: "Block3-1-2" },
    ]
];


module.exports = {program: mission2, params: params, diagram: diagram};
