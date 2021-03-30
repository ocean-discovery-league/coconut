'use strict';

///
/// mission2.js
///

const TIME_LAPSE_CYCLE = 50;  // in 1/10s,  50 = 5 secs
const SECOND_MS = 1000;


function mission2(inPhase, cycle_num, elapsed, action_elapsed, sensors) {
    let new_state;
    let new_phase;
    let options = {};
    
    ///
    /// Phase 1 - warm up the GPS history
    ///
    if (inPhase === 1) {
	if (elapsed < (SECOND_MS * 30)) {
	    new_state = 'WAIT';
	} else {
	    new_phase = inPhase + 1;
	}
    }

    ///
    /// Phase 2 - wait until the GLS loses lock (goes underwater)
    ///
    if (inPhase === 2) {
	if (sensors.GNSS && sensors.GNSS.getIsLocked()) {
	    new_state = 'WAIT';
	} else {
	    new_phase = inPhase + 1;
	}
    }

    ///
    /// Phase 3 - underwater, do time lapse photos
    ///
    if (inPhase === 3) {
	new_state = 'TIMELAPSE';
	options = {
	    cycle: TIME_LAPSE_CYCLE
	};

	if (sensors.GNSS && sensors.GNSS.getIsLocked()) {
	    new_phase = -1;
	}
    }

    return [new_state, new_phase, options];
}


module.exports = mission2;


