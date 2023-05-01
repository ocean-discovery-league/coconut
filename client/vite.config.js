// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';

// if (!process.env.MAKANIU_PROXY_ADDRESS) {
//     throw new Error('MAKANIU_PROXY_ADDRESS env variable required!');
// }

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [sveltekit()],
    // server: {
        // proxy: {
        //     '/api/*': process.env.MAKANIU_PROXY_ADDRESS,
        //     '/html/*': process.env.MAKANIU_PROXY_ADDRESS,
        //     '/b': process.env.MAKANIU_PROXY_ADDRESS,
        //     '/socket.io': {
        //         //target: process.env.MAKANIU_PROXY_ADDRESS.replace('http://', 'ws://'),
        //         target: process.env.MAKANIU_PROXY_ADDRESS,
        //         ws: true,
        //         changeOrigin: true
        //     }
        // }
    // }
};

export default config;
