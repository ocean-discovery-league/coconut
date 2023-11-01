'use strict';

import { writable, get } from 'svelte/store';

class FileCountsModel {
    constructor() {
        this.store = writable();
    }


    async init(socket, eventname='uploadall/filecounts') {
        if (!socket) {
            throw new Error('fileCountsModel.init() socket parameter required');
        }
        if (this.socket) {
            console.warn('fileCountsModel.init() called more than once, ignored');
            return;
        }

        this.socket = socket;
        socket.on(eventname, (data) => this.update(data));

        // this.store.subscribe((data) => {
        //     console.log('fileCountsModel store was updated', data);
        // });
    }


    update(data) {
        this.store.set(data);
    }
}

const fileCountsModel = new FileCountsModel;
fileCountsModel.store.init = async (...args) => { fileCountsModel.init(...args); };
export default fileCountsModel.store;
