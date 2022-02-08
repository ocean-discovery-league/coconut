'use strict';

///
/// mission1.js
///

/// this mission waits until depth is greater than 2 meters
/// and then records video in a 5 minutes on, 15 minutes off cycle
/// until we rise back up to the surface again

let params = {
    DEPTH_START_METERS: 2.0,  // start recording phase when we are deeper than this
    RECORD_CYCLE_MINS: 5,     // how many minutes to record per cycle
    PAUSE_CYCLE_MINS: 15,     // how many minutes to pause per cycle
    DEPTH_END_MISSION_METERS: 1.5  // end everything when we come back up and are shallower than this
};

const MS_PER_MINUTE = 1000 * 60;


function mission1(current_phase, cycle_num, elapsed, action_elapsed, monoclock, sensors) {
    let new_action;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1 - wait until we get deep enough
    ///
    if (current_phase === 1) {
	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < params.DEPTH_START_METERS)) {
	    new_action = 'WAIT';
	} else {
	    new_phase = current_phase + 1;
	}
    }

    ///
    /// Phase 2 - cycle between recording and pausing
    ///
    if (current_phase === 2) {

	if (action_elapsed < (params.RECORD_CYCLE_MINS * MS_PER_MINUTE)) {
	    new_action = 'RECORD_VIDEO';
	} else if (action_elapsed < ((params.PAUSE_CYCLE_MINS + params.RECORD_CYCLE_MINS) * MS_PER_MINUTE)) {
	    if (params.PAUSE_CYCLE_MINS > params.RECORD_CYCLE_MINUTES) {
		new_action = 'PAUSE_AND_BOX_VIDEO';
	    } else {
		new_action = 'PAUSE_VIDEO';
	    }
	} else {
	    new_action = 'ACTION_CLOCK_RESET';  // start cycle again
	}

	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < params.DEPTH_END_MISSION_METERS)) {
	    new_phase = -1;  // end mission
	}
    }

    return [new_action, new_phase, options];
}


const diagram = [
    [ // node data
        //{ key: "Phase0", text: "Start", isGroup: true, category: "Pool" },
        //{ key: "Action0-1", text: "start", isGroup: true, group: "Phase0", color: "#FDF3CD" },
        //{ key: "Block0-1-1", text: " If Collar @ M1 ", group: "Action0-1", color: "#FDF3CD" },

      { key: "Phase1", text: "Phase 1", isGroup: true, category: "Pool" },
        { key: "Action1-1", text: "depth", isGroup: true, group: "Phase1", color: "#69F4E4" },
        { key: "Block1-1-1", text: "Start", group: "Action1-1", color: "#F4E469" },
        { key: "Block1-1-2", text: "{}", group: "Action1-1", color: "#44CCCC",
	  param: "DEPTH_START_METERS",
	  value: 2,
	  type: "interval",
	  units: "meters",
	  label: "meter{s}",
	  abbr: "m",
	  template: "When depth > {x}{abbr}",
	  default: 2,
	  range: {
	    low: 1,
	    high: 1500
	  }
	},

      { key: "Phase2", text: "Phase 2", isGroup: true, category: "Pool" },
        { key: "Action2-1", text: "record", isGroup: true, group: "Phase2", color: "#69F4E4" },
        //{ key: "Block2-1-1", text: "If depth > 1.5m", group: "Action2-1", color: "#D2E0E3" },
        { key: "Block2-1-2", text: "Record video", group: "Action2-1", color: "#187D8B" },
        { key: "Block2-1-3", text: "{}", group: "Action2-1", color: "#44CCCC",
	  param: "RECORD_CYCLE_MINS",
	  value: 5,
	  type: "interval",
	  units: "minutes",
	  label: "minute{s}",
	  template: "For {x} minute{s}",
	  default: 5,
	  range: {
	    low: 1,
	    high: 1440
	  }
	},
        { key: "Action2-2", text: "next", isGroup: true, group: "Phase2", color: "#69F4E4" },
        //{ key: "Block2-2-1", text: "If depth > 1.5m", group: "Action2-2", color: "#D2E0E3" },
        { key: "Block2-2-2", text: "Pause video", group: "Action2-2", color: "#187D8B" },
        { key: "Block2-2-3", text: "{}", group: "Action2-2", color: "#44CCCC",
	  param: "PAUSE_CYCLE_MINS",
	  value: 15,
	  type: "interval",
	  units: "minutes",
	  label: "minute{s}",
	  template: "For {x} minute{s}",
	  default: 15,
	  range: {
	    low: 1,
	    high: 1440
	  }
	},
        { key: "Phase3", text: "End", isGroup: true, category: "Pool" },
        { key: "Action3-1", text: "end", isGroup: true, group: "Phase3", color: "#69F4E4" },
        { key: "Block3-1-1", text: "End", group: "Action3-1", color: "#FF9A00" },
        { key: "Block3-1-2", text: "{}", group: "Action3-1", color: "#44CCCC",
	  param: "DEPTH_END_MISSION_METERS",
	  value: 1,
	  type: "interval",
	  units: "meters",
	  label: "meters",
	  abbr: "m",
	  template: "If depth < {x}{abbr}",
	  default: 1.5,
	  range: {
	    low: 1,
	    high: 1500
	  }
	},
    ],
    [ // link data
        // { from: "Block0-1-1", to: "Block0-1-2" },
        // { from: "Phase0", to: "Phase1" },

        // { from: "Block1-1-1", to: "Block1-1-2" },
        { from: "Phase1", to: "Phase2" },

      { from: "Action2-1", to: "Action2-2", fromSpot: "Left", toSpot: "Left", fromEndSegmentLength: 20 },
      { from: "Action2-2", to: "Action2-1", fromSpot: "Right", toSpot: "Right", fromEndSegmentLength: 20 },

        // //{ from: "Block2-1-1", to: "Block2-1-2" },
        // { from: "Block2-1-2", to: "Block2-1-3" },

	// //{ from: "Block2-2-1", to: "Block2-2-2" },
        // { from: "Block2-2-2", to: "Block2-2-3" },

        // { from: "Block2-1-2", to: "Block2-2-2" },
        // { from: "Block2-2-2", to: "Block2-1-2" },
        { from: "Phase2", to: "Phase3" },

        // { from: "Block3-1-1", to: "Block3-1-2" },
    ]
];


module.exports = {program: mission1, params: params, diagram: diagram};
