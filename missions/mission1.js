'use strict';

///
/// mission1.js
///

const MINUTE_MS = 1000 * 60;


function mission1(inPhase, cycle_num, elapsed, action_elapsed, sensors) {
    let new_state;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1
    ///
    if (inPhase === 1) {
	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < 2.0)) {
	    new_state = 'WAIT';
	} else {
	    new_phase = inPhase + 1;
	}
    }

    ///
    /// Phase 2
    ///
    if (inPhase === 2) {

	if (action_elapsed < (MINUTE_MS * 5)) {
	    new_state = 'RECORD_VIDEO';
	} else if (action_elapsed < (MINUTE_MS * 20)) {
	    new_state = 'PAUSE_VIDEO';
	} else {
	    new_state = 'ACTION_CLOCK_RESET';
	}

	if (sensors.KELL && (sensors.KELL.getDepthInMeters() < 2.0)) {
	    new_phase = -1;
	}
    }

    return [new_state, new_phase, options];
}


module.exports = mission1;
