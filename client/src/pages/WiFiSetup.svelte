<script>
  import { onMount, onDestroy } from 'svelte';
  //import { dev } from '$app/env'
  import Button from '$lib/Button.svelte';

  let form_ssid;
  //let form_password; // 'type' attribute cannot be dynamic if input uses two-way binding

  let scan_request;
  let status_request;
  let connect_request;
  let disconnect_request;

  const SCAN_INTERVAL = 5 * 1000;  // 5 seconds
  const STATUS_INTERVAL = 1 * 1000;  // 1 second

  let scanTimeout;
  let statusTimeout;

  let connecting;
  let connect_error = '';
  let disconnecting;

  let connected_ssid;
  let connected_ipaddress;
  let connected_rssi;
  let wifi_section;

  let visible_networks = false;

  onMount(() => {
      scan_request = new Request('/scan', {mode: 'no-cors'});
      status_request = new Request('/status');
      connect_request = new Request('/connect');
      disconnect_request = new Request('/disconnect');

      // let proxy = process.env.MAKANIU_PROXY_ADDRESS;
      // if (proxy) {
      //     scan_request = new Request(`${proxy}/scan`);
      //     status_request = new Request(`${proxy}/status`);
      //     connect_request = new Request(`${proxy}/connect`);
      //     disconnect_request = new Request(`${proxy}/disconnect`);
      // }

      monitorStatus();
      monitorScan();
  });


  onDestroy(() => {
      clearTimeout(scanTimeout);
      clearTimeout(statusTimeout);
  });


  let password_is_visible = true;
  let password_visibility_icon;
  let password_input_type;
  $: password_visibility_icon = password_is_visible ? '👁️' : '😆';
  $: password_input_type = password_is_visible ? 'text' : 'password';
  function toggle_password_visibility(event) {
      password_is_visible = !password_is_visible;
      event.preventDefault();  // keep from stealing keyboard focus
  }


  function isOnScreen() {
      if (!wifi_section) {
          wifi_section = document.querySelector('#network-setup');
      }

      let rect = wifi_section.getBoundingClientRect();
      let elemLeft = rect.left;
      let elemRight = rect.right;

      //console.log(elemLeft, elemRight, window.innerWidth);

      let partiallyOnScreen = (elemRight > 0) && (elemLeft < window.innerWidth);
      //console.log('icu wifi?', partiallyOnScreen);
      return partiallyOnScreen;
  }


  // setTimeout and then wait for the first full frame after that
  // (so we can check isOnScreen without triggering any reflows)
  function setTimeoutAnimationFrame(callback, interval) {
      return setTimeout(() => window.requestAnimationFrame(callback), interval);
  }


  async function monitorStatus() {
      try {
          if (isOnScreen()) {
              let response = await fetch(status_request);
              let data = await response.json();
              if (data && !data.retry && Object.keys(data).length !== 0) {
                  showStatus(data);
              }
          }
      } catch(err) {
          console.error(err);
      }

  }


  function showStatus(status) {
      let state = status.wpa_state;
      // console.log(status);
      if (state) {
          if (state === 'COMPLETED') {
              let ssid = status.ssid.replace(/\n$/, '');  // remove newline at end of string
              connected_ssid = ssid || 'unknown';
              if (status.ip_address) {
                  connected_ipaddress = status.ip_address;
              }
          } else {
              connected_ssid = false;
              if (!['DISCONNECTED', 'SCANNING'].includes(state)) {
                  console.log('unknown state =', state);
              }
          }
      }
  }


  async function monitorScan() {
      if (isOnScreen()) {
          try {
              let response = await fetch(scan_request);
              let data = await response.json();
              //console.log(data);
              if (data && !data.retry && Object.keys(data).length !== 0) {
                  showScan(data);
              }
          } catch(err) {
              console.error(err);
              showScan();
          }
      }

      scanTimeout = setTimeoutAnimationFrame(monitorScan, SCAN_INTERVAL);
  }


  function showScan(data) {
      if (data === undefined) {
          visible_networks = undefined;
          return;
      }
      let seen = [];
      visible_networks = [];
      try {
          for (let n=0; n<data.length; n++) {
              let network = data[n];
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

              network.ssid = ssid;
              visible_networks.push(network);

              if (ssid === connected_ssid) {
                  connected_rssi = network.signal;
              }
          }
      } catch(err) {
          console.error(err);
      }
  }


  async function connect_wifi(event) {
      event.preventDefault();

      // 'type' attribute cannot be dynamic if input uses two-way binding
      let formdata = new FormData(event.target);
      let password = formdata.get('password');

      connecting = true;
      try {
          let data = {
              ssid: form_ssid,
              //password: form_password
              password: password
          };
          let response = await fetch(connect_request, {
              method: 'POST',
              body: JSON.stringify(data),
              headers: {
                  'Content-Type': 'application/json'
              }
          });
          let result = await response.text();
          console.log('result', result);
      } catch(err) {
          console.error(err);
      }
      connecting = false;
  }

  async function disconnect_wifi(event) {
      event.preventDefault();
      disconnecting = true;
      try {
          await fetch(disconnect_request, {
              method: 'POST',
          });
      } catch(err) {
          console.error(err);
      }
      disconnecting = false;
  }

  function click_network(event) {
      let network_li = event.target.parentElement;
      // FIXME ^^^ breaks if there's any li element padding
      // or li children go deeper than one level
      let clickssid = network_li.querySelector('.clickssid');
      form_ssid = clickssid.textContent;
  }
</script>


<div id="wifisetup-container">
  <center>
    <div id="wifi-connection">
      {#if !connected_ssid}
        <span style="color:darkgray">Not Connected</span>
        <br>
        &nbsp;
      {:else}
        <div style="position:relative">
          <span style="color:darkgray">connected to </span>{connected_ssid}
          {#if connected_rssi}
            &nbsp;<span style="position:absolute;color:#AAAAAA">{connected_rssi}</span>
          {/if}
        </div>
        {#if connected_ipaddress}
          <span style="color:#AAAAAA">{connected_ipaddress}</span>
        {:else}
          &nbsp;
        {/if}
      {/if}
    </div>

    <div class="connect-container">
      {#if connected_ssid}
        <br>
        <br>
        <Button nofeedback on:click={disconnect_wifi}>
          {#if !disconnecting}
            Disconnect WiFi
          {:else}
            Disconnecting...
          {/if}
        </Button>
        <br>
        <br>
      {:else}
        <form width="70%" on:submit={connect_wifi} enctype="multipart/form-data" method="post">
          <table width="400">
            <tr><td>
                <br>
                <div>
                  <label for="ssid">Network Name</label><br>
                  <input bind:value={form_ssid} autocorrect="off" autocapitalize="none" type="text" name="ssid" size="18" autocomplete="off" required/>
                </div>
            </td></tr><tr><td height="25">
            </td></tr><tr><td>
                <div>
                  <div id="visibility-container">
                    <label for="password">WiFi Password<div class="sublabel">blank if no password</div></label>
                    <button
                      id="visibility"
                      type="button"
                      on:click={toggle_password_visibility}
                      >
                      {password_visibility_icon}
                    </button>
                  </div>
                  <input autocorrect="off" autocapitalize="none" autocomplete="off" type={password_input_type} name="password" size="18"/>
                </div>
            </td></tr><tr><td height="40">
            </td></tr><tr><td>
                <center>
                  <Button nofeedback>
                    {#if !connecting}
                      Connect WiFi
                    {:else}
                      Connecting...
                    {/if}
                  </Button>
                  <div class="connect_status">{connect_error}</div>
                </center>
            </td></tr>
          </table>
        </form>
      {/if}
    </div>

    <br>
    <br>

    <div id="networklist-container">
      <div id="networklist">
        <center>
          <span style="color:darkgray">Visible Networks</span>
        </center>
        <br>
        <ul width=300 id="networks">
          {#if visible_networks === false}
            <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <span style="color:darkgray">• • •</span></li>
          {:else if visible_networks.length === 0}
            <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <span style="color:darkgray">none</span></li>
          {:else}
            {#each visible_networks as network}
              <li on:click={click_network}>
                <div style="position:relative">
                  <div style="position:absolute;color:#AAAAAA;left:-38px">{network.signal}</div>
                  <div style="position:absolute;color:#AAAAAA;left:-62px;font-size:14px;opacity:0.6">{network.security ? '🔒' : ''}</div>
                  <span class="clickssid">{network.ssid}</span>
                </div>
              </li>
            {/each}
          {/if}
        </ul>
      </div>
    </div>
  </center>
</div>

<style>
  #wifi-connection {
    font-size: 22px;
    font-weight: 700;
    color: white;
    margin-bottom: 20px;
  }

  .connect-container {
    height: 325px;
  }

  table {
    display: grid;
    place-items: center;
    background-color: rgba(0,0,0,0);
  }

  form {
    max-width: 800px;
    font-size: 20px;
    line-height: 26px;
    margin: 0 0 16px;
  }

  label {
    font-size: 20px;
    font-weight: 900;
  }

  .sublabel {
    font-size: 14px;
    margin-top: -8px;
    margin-left: 2px;
    line-height: 14px;
    color: darkgrey;
  }

  input {
    font-size: 24px;
    margin-top: 5px;
  }

  #visibility-container {
    position: relative;
  }
  #visibility-container label {
    display: inline-block;
  }   
  button#visibility {
    width: 30px;
    height: 30px;
    position: absolute;
    top: 8px;
    right: 3px;
    border-radius: 2px;
    border-width: 1px;
    background-color: #BBEBFF;
  }

  #networklist-container {
    display: grid;
    place-items: center;
  }

  #networklist {
    width: 220px;
    text-align: left;
  }

  #networklist ul {
    list-style: none;
    font-size: 20px;
    font-weight: 900;
    margin-left: 2px;
    margin-top: 4px;
    white-space: nowrap;
  }

  .selector * {
    width: 300px;
    pointer-events: none;
  }
  
  .selected {
    background-color: #BBEBFF;
  }
</style>
