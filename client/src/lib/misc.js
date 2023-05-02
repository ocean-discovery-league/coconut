'use strict';

let socket;
let unittype;

export function getSocketIO() {
    if (!socket) {
        console.log('my socket');
        socket = io.connect();
        socket.on('error', console.error);
        socket.on('connect', () => {
            console.log('web socket connected');
        });
        socket.on('disconnect', () => console.log('web socket disconnected'));
    }
    return socket;
}


export async function fetch200(...args) {
    let response = await fetch(...args);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response;
}


export async function getUnitType(fallback_unittype='MKN') {
    if (unittype) {
        return unittype;
    }

    let hashParams = parseHashParams();
    if (hashParams.has('unittype')) {
        unittype = hashParams.get('unittype');
        return unittype;
    }

    try {
        let request = new Request('/api/v1/rover/unittype');
        let response = await fetch200(request);
        let data = await response.json();
        unittype = data.unittype;
    } catch(err) {
        console.warn('error while fetching unittype', err);
        unittype = fallback_unittype;  // should we perhaps not set this so it will try again?
    }

    return unittype;
}


export function parseHashParams(defaultHashString) {
    let hashParams = {};
    try {
        if (window && window.location) {
            let hash = window.location.hash;
            if (hash.length === 0) {
                window.location.hash = defaultHashString;  // will add a '#' if missing
                hash = window.location.hash;
            }
            hash = hash.substr(1);  // drop the '#'
            // note: the hash property is not url decoded
            //hash = decodeURIComponent(hash); // but using the URLSearchParams API will decode it
            hashParams = new URLSearchParams('?' + hash);  // the '?' isn't strictly necessary
        } else {
            console.warn('no hash params, window.location.hash is missing');
        }
    } catch(err) {
        console.warn('error in parseHashParams()', err);
    }
    return hashParams;
}

