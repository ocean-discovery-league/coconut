'use strict';

import { writable, get } from 'svelte/store';

class DownloadingModel {
    constructor() {
        this.store = writable();
    }


    async init(socket, eventname='uploadall/downloading') {
        if (!socket) {
            throw new Error('downloadingModel.init() socket parameter required');
        }
        if (this.socket) {
            console.warn('downloadingModel.init() called more than once, ignored');
            return;
        }

        this.socket = socket;
        socket.on(eventname, (data) => this.update(data));

        // this.store.subscribe((data) => {
        //     console.log('downloadingModel store was updated', data);
        // });
    }


    update(data) {
        this.store.set(data);
    }
}

const downloadingModel = new DownloadingModel;
downloadingModel.store.init = async (...args) => { downloadingModel.init(...args); };
export default downloadingModel.store;
