<script>
  import { onMount, onDestroy } from 'svelte';

  let status_request;
  let scan_request;
  let signal_request;

  const STATUS_INTERVAL = 1 * 1000;  // 1 second
  const SCAN_INTERVAL = 5 * 1000;  // 5 seconds
  const SIGNAL_INTERVAL = 1 * 1000;  // 1 second

  let current_rssid;
  let wifi_section;


  onMount(() => {
    status_request = new Request('/status');
    scan_request = new Request('/scan');
    signal_request = new Request('/signal');

    let wifi_form = document.getElementById('connect_wifi_form');
    wifi_form.addEventListener('submit', connect_wifi);
    monitorStatus();
    monitorScan();
    //monitorSignal();
  });


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


  // setTimeout and then wait for the first full frame after that
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

  function click_network(event) {
    let network_li = event.target.parentElement;  // FIXME breaks if there's any li element padding, or li children go deeper than one level
    let clickssid = network_li.querySelector('.clickssid');
    let ssid_input = document.getElementById('ssid');
    ssid_input.value = clickssid.textContent;
  }
</script>

<h2 style="font-size:64px">📶
    <span style="font-size:58px">WiFi Setup</span>
  </h2>

  <br>
  <br>
  <center>
    <div style="font-size:22px;font-weight:700;color:white;margin-bottom:20px"><span id="connection">• • •<br>&nbsp;</span></div>
  </center>

  <center>
      <form width="70%" id="connect_wifi_form" enctype="multipart/form-data" method="post" style="font-size: 20px; line-height: 26px; margin: 0 0 16px">
	<table width="400" style="display:grid;place-items:center;background-color:#1B3C45">
	  <tr><td>
	      <br>
	      <br>
	      <div style="font-size:20px;font-weight:900">
		<label for="ssid">Network Name</label><br>
		<input id="ssid" autocorrect="off" autocapitalize="none" type="text" name="ssid" size="18" style="font-size:24px;margin-top:5px;" required/>
	      </div>
	  </td></tr><tr><td style="height:25px">
	  </td></tr><tr><td style="font-size:20px;font-weight:900">
	      <div style="font-size:20px;font-weight:900">
		<label for="password">WiFi Password<div style="font-size:11px;margin-top:-8px;margin-left:2px"><i>leave blank if no password</i></div></label>
		<input id="password" autocorrect="off" autocapitalize="none" autocomplete="off" type="text" name="password" size="18" style="font-size:24px"/>
		<button id="visibility" type="button" onclick="window.client.toggle_password_visibility(event)" style="width:30px;height:30px;position:absolute;margin-left:6px;margin-top:1px;border-radius:2px;border-width:1px;background-color:#BBEBFF">👁️</button>
	      </div>
	  </td></tr><tr><td style="height:25px">
	  </td></tr><tr><td style="text-align:center">
	    <span style="display: inline-block; border-radius: 4px; background: #1f8b5f; border-bottom: 2px solid #1f8b5f;">
	      <button style="color: white; font-weight: normal; text-decoration: none; word-break: break-word; font-size: 20px; line-height: 26px; border-top: 14px solid; border-bottom: 14px solid; border-right: 32px solid; border-left: 32px solid; background-color: #2ab27b; border-color: #2ab27b; display: inline-block; letter-spacing: 1px; min-width: 80px; text-align: center; border-radius: 4px; text-shadow: 0 1px 1px rgba(0,0,0,0.25);">
		Connect WiFi
	      </button>
	    </span>
	    <br>
	    <br>
	    <br>
	</td></tr>
      </table>
    </form>
  </center>
  <br>
  <center>
    <div style="display:grid;place-items:center">
      <div style="width:220px;text-align:left">
	<font color="gray">Visible networks</font>
	<ul width=300 id="networks" style="list-style:none;font-size:20px;font-weight:900;margin-left:2px;margin-top:4px;white-space:nowrap">
	  <li><i>looking for networks...</i></li>
	</ul>
      </div>
      </div>
  </center>

  <div id="statusdiv"></div>
  <div id="signaldiv"></div>
<!--  <div id="scandiv"></div> -->

