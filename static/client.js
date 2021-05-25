'use strict';

window.client = window.client || {};

const status_request = new Request('/status');
const scan_request = new Request('/scan');
const signal_request = new Request('/signal');
const missionid_request = new Request('/missionid');


const STATUS_INTERVAL = 1 * 1000;  // 1 second
const SCAN_INTERVAL = 5 * 1000;  // 5 seconds
const SIGNAL_INTERVAL = 1 * 1000;  // 1 second

let current_rssid;

let wifi_section;
function isVisible() {
    if (!wifi_section) {
	wifi_section = document.querySelector('#wifi_section');
    }

    let rect = wifi_section.getBoundingClientRect();
    let elemLeft = rect.left;
    let elemRight = rect.right;

    //console.log(elemLeft, elemRight, window.innerWidth);

    let partiallyVisible = (elemRight > 0) && (elemLeft < window.innerWidth);
    //console.log('icu wifi?', partiallyVisible);
    return partiallyVisible;
}


// setTimeout but then wait for the first full frame after that
// (so we can check isVisible without triggering any reflows)
function setTimeoutAnimationFrame(callback, interval) {
    setTimeout(() => window.requestAnimationFrame(callback), interval);
}


async function monitorStatus() {
    try {
	if (isVisible()) {
            let response = await fetch(status_request);
            let data = await response.json();
	    if (data && !data.retry && Object.keys(data).length !== 0) {
		showStatus(data);
	    }
	}
    } catch(err) {
        console.error(err);
    }
    setTimeoutAnimationFrame(monitorStatus, STATUS_INTERVAL);
}


function showStatus(status) {
    let connectiondiv = document.querySelector('#connection');
    let state = status.wpa_state;
    let html = '• • •<br>&nbsp;';
    console.log(status);
    if (state) {
	let ssid = status.ssid.replace(/\n$/, '');  // remove newline at end of string
	if (state === 'COMPLETED') {
	    html = '<div style="position:relative" data-ssid="' + (ssid || '') + '"><font color="gray">connected to </font>' + (ssid || 'unknown') + '&nbsp;&nbsp;';
	    if (current_rssid) {
		html += '<span style="position:absolute;color:#AAAAAA">' + current_rssid + '</span>';
	    }
	    html += '</div>';
	} else {
	    console.log('state =', state);
	}
	if (status.ip_address) {
	    html += '<br><span style="position:absolute;color:#AAAAAA">' + status.ip_address + '</span>';
	} else {
	    html += '<br>&nbsp;';
	}
    }
    //connectiondiv.innerHTML = status.ssid + ` &nbsp; <button onclick="fetch(new Request('/disconnect',{method:'POST'}))">&#x274c/button>`;
    connectiondiv.innerHTML = html;
}


async function monitorScan() {
    try {
	if (isVisible()) {
            let response = await fetch(scan_request);
            let json = await response.json();
	    console.log(json);
	    if (json && !json.retry && Object.keys(json).length !== 0) {
		showScan(json);
	    }
	}
    } catch(err) {
        console.error(err);
    }
    setTimeoutAnimationFrame(monitorScan, SCAN_INTERVAL);
}


function showScan(json) {
    let networks_ul = document.querySelector('#networks');
    let html = '';
    let seen = [];
    try {
	for (let n=0; n<json.length; n++) {
	    let network = json[n];
	    let ssid = network.ssid;
	    if (!ssid || ssid.includes('\x00') || ssid.includes('\\x00')) {
		continue;
	    }
	    if (ssid.startsWith('mkn0')) {
		continue;
	    }
	    if (seen.includes(ssid)) {
		continue;
	    }
	    seen.push(ssid);
	    html += '<li onclick="window.client.click_network(event)">'
		+ '<div style="position:relative">'
		+ '<div style="position:absolute;color:#AAAAAA;left:-38px">' + network.signal + '</div>'
		+ '<div style="position:absolute;color:#AAAAAA;left:-62px;font-size:14px;opacity:0.6">' + (network.security ? '🔒' : '') + '</div>'
		+ '<span class="clickssid">' + ssid + '</span></li>\n';  // FIXME unsafe!
	    current_rssid = network.signal;
	}
    } catch(err) {
	console.error(err);
    }
    networks_ul.innerHTML = html;
    //let scandiv = document.querySelector('#scandiv');
    //scandiv.innerHTML = JSON.stringify(json);
}


async function monitorSignal() {
    try {
	if (isVisible()) {
            let response = await fetch(signal_request);
            let json = await response.json();
	    if (json && !json.retry && Object.keys(json).length !== 0) {
		showSignal(json);
	    }
	}
    } catch(err) {
        console.error(err);
    }
    setTimeoutAnimationFrame(monitorSignal, SIGNAL_INTERVAL);
}


function showSignal(json) {
    //let signaldiv = document.querySelector('#signaldiv');
    //signaldiv.innerHTML = JSON.stringify(json);
}


async function fillInMissionID() {
    let response = await fetch(missionid_request);
    console.log(response);
    let json = await response.json();
    console.log(json);
    let hostname_banner = document.querySelector('#hostname');
    let macaddress_banner = document.querySelector('#macaddress');
    let username_field = document.querySelector('#username');
    let missionid_field = document.querySelector('#missionid');
    hostname_banner.innerText = json.hostname || '';
    macaddress_banner.innerText = json.macaddress || '';
    username_field.value  = json.username  || '';
    missionid_field.value = json.missionid || '';
}


let hashParams = {};
function parseHash() {
    let hash = window.location.hash.substr(1);
    hashParams = hash.split('&').reduce(function (result, item) {
	let parts = item.split('=');
	if (typeof parts[1] === 'undefined') {
	    parts[1] = true;
	}
	result[parts[0]] = parts[1];
	return result;
    }, {});
}


let socket;
async function init() {
    //document.body.classList.add('horizontal-mode');

    socket = io.connect();
    socket.on('error', console.error);
    socket.on('connection', () => {
	console.log('web socket connected');
    });
    socket.on('disconnect', () => console.log('web socket disconnected'));

    socket.on('filecounts', (data) => update_file_counts(data));
    socket.on('uploadprogress', (data) => update_upload_progress(data));

    let wifi_form = document.getElementById('connect_wifi_form');
    wifi_form.addEventListener('submit', connect_wifi);

    let missionid_form = document.getElementById('missionid_form');
    missionid_form.addEventListener('submit', save_missionid);

    let mediamanager = document.getElementById('mediamanager');
    mediamanager.src = window.location.protocol + '//' + window.location.hostname + '/html/preview.php';

    if (window.location.hash.substr(1)) {
	parseHash();
	if (hashParams.page) {
            let n = Number(hashParams.page);
            let sections = document.querySelectorAll('section');
            if (sections[n-1]) {
		sections[n-1].scrollIntoView(true);
		//sections[n-1].focus();
            }
	}
    } else {
	window.location.hash = "page=2";
	let n = 2;
        let sections = document.querySelectorAll('section');
        if (sections[n-1]) {
	    sections[n-1].scrollIntoView(true);
	    //sections[n-1].focus();
        }
    }
    fillInMissionID();
    monitorStatus();
    monitorScan();
    //monitorSignal();
}


function toggle_body_class(classname) {
    if (document.body.classList.contains(classname)) {
	document.body.classList.remove(classname);
    } else {
	document.body.classList.add(classname);
    }
}


function reset_scroll(id) {
    let div = document.getElementById(id);
    if (div) {
	div.scrollTop = 0;
	div.focus();
    }
}


async function connect_wifi(event) {
    console.log(event);
    console.log(event.target);
    event.preventDefault();

    let formdata = new FormData(event.target);
    console.log(formdata);
    console.log(formdata.get('ssid'));
    console.log(formdata.get('password'));

    let json = {
	ssid: formdata.get('ssid'),
	password: formdata.get('password')
    };
    await fetch('/connect', {
	method: 'POST',
	body: JSON.stringify(json),
	headers: {
	    'Content-Type': 'application/json'
	}
    });
    //await fetch(new Request('/connect',{method:'POST',body:formdata}))
}


function toggle_password_visibility(event) {
    let password = document.getElementById('password');
    let toggle = document.getElementById('visibility');
    if (password.type !== 'password') {
	password.type = 'password';
	visibility.innerHTML = '😆';
    } else {
	password.type = 'text';
	visibility.innerHTML = '👁️';
    }	
    event.preventDefault();  // keep from stealing keyboard focus
}


async function save_missionid(event) {
    event.preventDefault();
    
    let savemissionid_button = document.querySelector('#savemissionid');
    let savemissionidstatus_div = document.querySelector('#savemissionidstatus');
    savemissionid_button.focus();

    try {
	let formdata = new FormData(event.target);
	let username  = formdata.get('username');
	let missionid = formdata.get('missionid');
	console.log(formdata);
	console.log(username);
	console.log(missionid);

	let json = { username, missionid };
	savemissionidstatus_div.innerHTML = ' &nbsp; &nbsp;• • •';
	let response = await fetch(missionid_request, {
	    method: 'POST',
	    body: JSON.stringify(json),
	    headers: {
		'Content-Type': 'application/json'
	    }
	});

	if (response.ok) {
	    savemissionidstatus_div.innerText = 'Saved!';
	} else {
	    savemissionidstatus_div.innerText = `Error: ${response.statusText}`;
	}
    } catch(err) {
	savemissionidstatus_div.innerText = `Error: ${err}`;
    }
}


let uploading = false;

async function upload_all(event) {
    let uploadall_button = document.querySelector('#uploadall');
    let uploadstatus_div = document.querySelector('#uploadstatus');
    if (!uploading) {
	try {
	    console.log('upload all!');
	    uploadall_button.innerText = '  Cancel Upload ';
	    uploadstatus_div.innerText = 'Uploading...';
	    uploading = true;
	    let response = await fetch('/uploadall', {
		method: 'POST',
		//body: JSON.stringify(json),
		headers: {
		    'Content-Type': 'application/json'
		}
	    });
	    
	    uploading = false;
	    uploadall_button.innerText = 'Upload All Files To Tator.io';
	    if (response.ok) {
		let text = await response.text();
		console.log('text', text);
		if (!text) {
		    text = 'Upload done!';
		}
		uploadstatus_div.innerText = text;
	    } else {
		uploadstatus_div.innerText = `Upload error: ${response.statusText}`;
	    }
	} catch(err) {
	    uploading = false;
	    uploadall_button.innerText = 'Upload All Files To Tator.io';
	    uploadstatus_div.innerText = `Upload error: ${err}`;
	}
    } else {
	upload_all_cancel(event);
    }
}


async function upload_all_cancel(event) {
    let uploadall_button = document.querySelector('#uploadall');
    let uploadstatus_div = document.querySelector('#uploadstatus');
    if (uploading) {
	try {
	    console.log('upload all cancel!');
	    uploadall_button.innerText = 'Canceling...';
	    //uploadstatus_div.innerText = 'Uploading...';
	    let response = await fetch('/uploadall_cancel', { method: 'POST' });
	    
	    uploading = false;
	    uploadall_button.innerText = 'Upload All';
	    if (response.ok) {
		uploadstatus_div.innerText = 'Upload canceled';
	    } else {
		uploadstatus_div.innerText = `Upload cancel error: ${response.statusText}`;
	    }
	} catch(err) {
	    uploading = false;
	    uploadall_button.innerText = 'Upload All';
	    uploadstatus_div.innerText = `Upload error: ${err}`;
	}
    }
}


function update_file_counts(data) {
    if (!uploading) {
	let filecounts_div = document.querySelector('#filecounts');
	let summary = file_counts_summary_text(data);
	filecounts_div.innerText = summary;
    }
}


function file_counts_summary_text(filecounts) {
    let jpg = filecounts.jpg || 0;
    let mp4 = filecounts.mp4 || 0;
    let h264 = filecounts.h264 || 0;
    let text = `${filecounts.txt} txts, ${filecounts.jpg||0} jpgs, ${filecounts.mp4||0} mp4s`;
    // if (filecounts.h264) {
    //     text += ` ${filecounts.h264} h264`;
    // }
    return text;
}


function update_upload_progress(data) {
    if (uploading) {
	let uploadstatus_div = document.querySelector('#uploadstatus');
	let filecounts_div = document.querySelector('#filecounts');
	let html = `Uploading ${data.n+1} of ${data.of+1} ${data.ext}s`;
	uploadstatus_div.innerHTML = html;
	let summary = file_counts_summary_text(data.filecounts);
	filecounts_div.innerText = summary;
    }
}


function click_network(event) {
    let network_li = event.target.parentElement;  // FIXME breaks if there's any li element padding, or li children go deeper than one level
    let clickssid = network_li.querySelector('.clickssid');
    let ssid_input = document.getElementById('ssid');
    ssid_input.value = clickssid.textContent;
}

window.client.init = init;
window.client.connect_wifi = connect_wifi;
window.client.save_misisonid = save_missionid;
window.client.toggle_password_visibility = toggle_password_visibility;
window.client.click_network = click_network;
window.client.upload_all = upload_all;
window.client.upload_all_cancel = upload_all_cancel;
