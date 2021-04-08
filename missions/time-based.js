'use strict';

///
/// time-based.js
///

/// this mission is strictly based the passage of time and doesn't use any sensor data
/// wait for 5 minutes, then record video for 5 mins and then pause for 15 minutes
/// in a cycle until 50 minutes have passed and then end the mission

const INITIAL_PAUSE_MINS = 5;  // wait 5 minutes before doing anything
const RECORD_CYCLE_MINS = 5;   // how many minutes to record per cycle
const PAUSE_CYCLE_MINS = 15;   // how many minutes to pause per cycle
const END_MISSION_MINS = 50;   // end mission after this many minutes

const MS_PER_MINUTE = 1000 * 60;


function time_based(current_phase, cycle_num, elapsed, action_elapsed, monoclock, sensors) {
    let new_action;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1 - wait out initial pause
    ///
    if (current_phase === 1) {
	if (elapsed < (INITIAL_PAUSE_MINS * MS_PER_MINUTE)) {
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

	if (elapsed > (END_MISSION_MINS * MS_PER_MINUTE)) {
	    new_phase = -1;  // end mission
	}
    }

    return [new_action, new_phase, options];
}


module.exports = time_based;
