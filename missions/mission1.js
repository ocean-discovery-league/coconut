'use strict';

///
/// mission1.js
///

/// this mission waits until depth is greater than 2 meters
/// and then record video in a 5 minutes on, 15 minutes off cycle
/// until we rise back up to the surface again

const DEPTH_START_METERS = 2.0;  // start recording phase when we are deeper than this
const RECORD_CYCLE_MINS = 5;     // how many minutes to record per cycle
const PAUSE_CYCLE_MINS = 15;     // how many minutes to pause per cycle
const DEPTH_END_MISSION_METERS = 2.0;  // end everything when we come back up and are shallower than this

const MS_PER_MINUTE = 1000 * 60;


function mission1(current_phase, cycle_num, elapsed, action_elapsed, monoclock, sensors) {
    let new_action;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1 - wait until we get deep enough
    ///
    if (current_phase === 1) {
	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < DEPTH_START_METERS)) {
	    new_action = 'WAIT';
	} else {
	    new_phase = current_phase + 1;
	}
    }

    ///
    /// Phase 2 - cycle between recording and pausing
    ///
    if (current_phase === 2) {

	if (action_elapsed < (RECORD_CYCLE_MINS * MS_PER_MINUTE)) {
	    new_action = 'RECORD_VIDEO';
	} else if (action_elapsed < ((PAUSE_CYCLE_MINS + RECORD_CYCLE_MINS) * MS_PER_MINUTE)) {
	    if (PAUSE_CYCLE_MINS > (RECORD_CYCLE_MINUTES)) {
		new_action = 'PAUSE_AND_BOX_VIDEO';
	    } else {
		new_action = 'PAUSE_VIDEO';
	    }
	} else {
	    new_action = 'ACTION_CLOCK_RESET';  // start cycle again
	}

	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < DEPTH_END_MISSION_METERS)) {
	    new_phase = -1;  // end mission
	}
    }

    return [new_action, new_phase, options];
}


module.exports = mission1;
