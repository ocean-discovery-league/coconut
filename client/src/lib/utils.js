'use strict';

let socket;

export function getSocketIO() {
    if (!socket) {
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
