<script>
  export let devicetype;

  import { onMount, onDestroy } from 'svelte';
  //import { dev } from '$app/environment'
  import { fetch200, isOnScreen, setTimeoutAnimationFrame } from '$lib/misc.js';
  import Button from '$lib/Button.svelte';

  let wifiSetup;
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

  let visible_networks = false;

  onMount(() => {
      scan_request = new Request('/api/v1/wifi/scan', {mode: 'no-cors'});
      status_request = new Request('/api/v1/wifi/status');
      connect_request = new Request('/api/v1/wifi/connect');
      disconnect_request = new Request('/api/v1/wifi/disconnect');

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
  let visible_icon = '➕';  // https://emojipedia.org/plus
  let not_visible_icon = '➖';  // https://emojipedia.org/minus
  $: password_visibility_icon = password_is_visible ? visible_icon : not_visible_icon;  // eyes: '👁️' : '😆';
  $: password_input_type = password_is_visible ? 'text' : 'password';
  function toggle_password_visibility(event) {
      password_is_visible = !password_is_visible;
      event.preventDefault();  // keep from stealing keyboard focus
  }


  async function monitorStatus() {
      console.log('monitoring status');
      try {
          if (isOnScreen(wifiSetup)) {
              let response = await fetch200(status_request);
              let data = await response.json();
              if (data && !data.retry && Object.keys(data).length !== 0) {
                  showStatus(data);
              }
          }
      } catch(err) {
          console.error(err);
      }
      statusTimeout = setTimeoutAnimationFrame(monitorStatus, STATUS_INTERVAL);
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
      if (isOnScreen(wifiSetup)) {
          try {
              let response = await fetch200(scan_request);
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
          let response = await fetch200(connect_request, {
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
          await fetch200(disconnect_request, {
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


<div class="wifisetup-container" bind:this={wifiSetup}>
  <center>
    <div class="connect-container">
    <div class="wifi-connection">
      {#if !connected_ssid}
        <span class="not-connected">Not Connected</span>
      {:else}
        <div style="position:relative">
          Connected to<br><span class="connected-ssid">{connected_ssid}</span>
          {#if connected_rssi}
            <span class="connected-rssi">{connected_rssi}</span>
          {/if}
        </div>
        {#if connected_ipaddress}
          <span class="connected-ipaddress">{connected_ipaddress}</span>
        {:else}
          &nbsp;
        {/if}
      {/if}
    </div>

      {#if connected_ssid}
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
                <div>
                  <label for="ssid">Network Name</label><br>
                  <input bind:value={form_ssid} autocorrect="off" autocapitalize="none" type="text" name="ssid" size="18" autocomplete="off" required/>
                </div>
            </td></tr><tr><td height="25">
            </td></tr><tr><td>
                <div>
                    <label for="password">WiFi Password<div class="sublabel">blank if no password</div></label>
                  <input autocorrect="off" autocapitalize="none" autocomplete="off" type={password_input_type} name="password" size="18"/>
                  <div class="visibility-container">
                    <button
                      class="visibility"
                      type="button"
                      on:click={toggle_password_visibility}
                      >
                      {password_visibility_icon}
                    </button>
                  </div>
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

    <div class="networklist-container">
      <div class="networklist">
        <center>
          Visible Networks
        </center>
        <ul width=300 id="networks">
          {#if !visible_networks}
            <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; • • •</li>
          {:else if visible_networks && visible_networks.length === 0}
            <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; none</li>
          {:else}
            {#each visible_networks as network}
              <li on:click={click_network}>
                <div style="position:relative">
                  <div style="position:absolute;left:-38px">{network.signal}</div>
                  <div style="position:absolute;left:-62px;font-size:14px;opacity:0.6">{network.security ? '🔒' : ''}</div>
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
  .wifisetup-container {
    color: var(--odl-gray-4);
    font-weight: var(--odl-font-normal);
  }

  .connected-ssid {
    font-size: 22px;
    font-weight: var(--odl-font-bold);
    color: white;
  }

  .connected-rssi, .connected-ipaddress {
    font-weight: var(--odl-font-bold);
  }

  .not-connected {
    font-weight: var(--odl-font-bold);
  }

  .wifi-connection {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .connect-container {
    height: 325px;
  }

  table {
    display: grid;
    place-items: center;
    background-color: transparent;
  }

  form {
    max-width: 800px;
    font-size: 20px;
    line-height: 26px;
    margin-top: -5px;
  }

  label {
    font-size: 20px;
  }

  .sublabel {
    position: relative;
    top: 5px;
    font-size: 12px;
    margin-top: -7px;
    margin-left: 2px;
    margin-bottom: 2px;
    line-height: 14px;
  }

  input {
    font-size: 24px;
    margin-top: 5px;
  }

  .visibility-container {
    position: relative;
  }
  button.visibility {
    display: inline-block;
    width: 30px;
    height: 30px;
    position: absolute;
    font-size: 20px;
    top: -31px;
    right: -38px;
    border-radius: 2px;
    border-width: 1px;
    background-color: var(--odl-brand-3);
  }

  .networklist-container {
    display: grid;
    place-items: center;
  }

  .networklist {
    width: 220px;
    text-align: left;
  }

  .networklist ul {
    list-style: none;
    font-size: 20px;
    font-weight: var(--odl-font-bold);
    margin-left: 2px;
    margin-top: 8px;
    white-space: nowrap;
  }

  .selector * {
    width: 300px;
    pointer-events: none;
  }
  
  .selected {
    background-color: var(--odl-brand-1);
  }
</style>
