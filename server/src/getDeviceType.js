'use strict';

const os = require('os');

const DEFAULT_DEVICETYPE = 'MKN';
const VALID_DEVICETYPES = ['MKN', 'LIT', 'NUC', 'PI'];


function getDeviceType() {
    let devicetype;
    let hostname = os.hostname();
    let prefix = hostname.substr(0, 3);
    prefix = prefix.toUpperCase();
    if (VALID_DEVICETYPES.includes(prefix)) {
        devicetype = prefix;
    }

    if (!devicetype) {
        let found = hostname.match(/^[^-]+[-][^-]+[-]([a-z]+)[-][^-]+$/i);  // e.g. s02-n00-nuc-102
        if (found && found[1]) {
            let clause3 = found[1].toUpperCase();
            if (VALID_DEVICETYPES.includes(clause3)) {
                devicetype = clause3;
            }
        }
    }

    if (!devicetype) {
        if (os.arch() === 'arm') {
            // for now assume it's a pi
            if (VALID_DEVICETYPES.includes('PI')) {
                devicetype = 'PI';
            }
        }
    }

    if (!devicetype) {
        devicetype = DEFAULT_DEVICETYPE;
    }

    return devicetype;
}


module.exports = getDeviceType;
