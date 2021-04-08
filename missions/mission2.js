'use strict';

///
/// mission2.js
///

/// this mission waits until GPS lock has been lost, and then takes
/// pictures every 5 seconds until GPS lock is regained

const TIME_LAPSE_CYCLE = 50;  // in 1/10s,  50 = take picture every 5 secs


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
	    cycle: TIME_LAPSE_CYCLE
	};

	if (sensors.GNSS && sensors.GNSS.getIsLocked(monoclock)) {
	    new_phase = -1;  // end mission
	}
    }

    return [new_action, new_phase, options];
}


module.exports = mission2;


