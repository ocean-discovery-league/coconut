'use strict';

///
/// time-based.js
///

const MINUTE_MS = 1000 * 60;


function time_based(current_phase, cycle_num, elapsed, action_elapsed, monoclock, sensors) {
    let new_action;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1
    ///
    if (current_phase === 1) {
	if (elapsed < (MINUTE_MS * 5)) {
	    new_action = 'WAIT';
	} else {
	    new_phase = current_phase + 1;
	}
    }

    ///
    /// Phase 2
    ///
    if (current_phase === 2) {

	if (action_elapsed < (MINUTE_MS * 5)) {
	    new_action = 'RECORD_VIDEO';
	} else if (action_elapsed < (MINUTE_MS * 20)) {
	    new_action = 'PAUSE_VIDEO';
	} else {
	    new_action = 'ACTION_CLOCK_RESET';
	}

	if (elapsed > (MINUTE_MS * 50)) {
	    new_phase = -1;
	}
    }

    return [new_action, new_phase, options];
}


module.exports = time_based;
