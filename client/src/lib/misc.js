'use strict';

let socket;
let devicetype;

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


export async function getDeviceType(fallback_devicetype='MKN') {
    if (devicetype) {
        return devicetype;
    }

    let hashParams = parseHashParams();
    if (hashParams.has('devicetype')) {
        devicetype = hashParams.get('devicetype');
        return devicetype;
    }

    try {
        let request = new Request('/api/v1/rover/devicetype');
        let response = await fetch200(request);
        let data = await response.json();
        devicetype = data.devicetype;
    } catch(err) {
        console.warn('error while fetching devicetype', err);
        devicetype = fallback_devicetype;  // should we perhaps not set this so it will try again?
    }

    return devicetype;
}


export function parseHashParams(defaultHashString=null) {
    let hashParams = {};
    try {
        if (window && window.location) {
            let hash = window.location.hash;
            if (hash.length === 0 && defaultHashString) {
                window.location.hash = defaultHashString;  // a '#' will be added if missing
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


export function isOnScreen(element) {
    let rect = element.getBoundingClientRect();
    let elemLeft = rect.left + 2;
    let elemRight = rect.right - 2;

    let partiallyOnScreen = (elemRight > 0) && (elemLeft < window.innerWidth-1);
    return partiallyOnScreen;
}


// setTimeout and then wait for the first full frame after that
// (so we can do things like check isOnScreen() without triggering any reflows)
export function setTimeoutAnimationFrame(callback, interval) {
    return setTimeout(() => window.requestAnimationFrame(callback), interval);
}
