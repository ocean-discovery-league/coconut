<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetch200, getSocketIO } from '$lib/utils.js';
  //import { dev } from '$app/env'
  import Button from '$lib/Button.svelte';

  const REQUEST_SCAN_INTERVAL = 5 * 1000;  // 5 seconds

  let requestScanTimeout;
  let onscreen_section;

  let socket;
  let btpair_request;
  let btunpair_request;
  let btconnect_request;
  let btdisconnect_request;

  let btconnecting;
  let btconnect_error = '';
  let btdisconnecting;

  let connected_btdevice;
  let connected_macaddress;
  let connected_btrssi;

  let selected_btdevice;

  let visible_btdevices = false;

  onMount(() => {
      socket = getSocketIO();
      // socket.onAny( (eventName, ...args) => {
      //     console.log('socket event', eventName, ...args);
      // });
      socket.on('bluetooth/devices', (...args) => handle_btdevices_event(...args));
      btpair_request = new Request('/api/v1/bluetooth/pair');
      btunpair_request = new Request('/api/v1/bluetooth/unpair');
      btconnect_request = new Request('/api/v1/bluetooth/connect');
      btdisconnect_request = new Request('/api/v1/bluetooth/disconnect');

      requestScan();
  });


  onDestroy(() => {
      clearTimeout(requestScanTimeout);
  });


  let filter_btdevices = true;
  let btdevices_filter_icon;
  $: btdevices_filter_icon = filter_btdevices ? '👁️' : '😆';
  function toggle_btdevices_filter(event) {
      filter_btdevices = !filter_btdevices;
      event.preventDefault();  // keep from stealing keyboard focus
  }


  function isOnScreen() {
      if (!onscreen_section) {
          onscreen_section = document.querySelector('#network-setup');
      }

      if (!onscreen_section) {
          console.log('not yet');
          return false;
      }

      let rect = onscreen_section.getBoundingClientRect();
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


  function showBTStatus(status) {
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


  async function requestScan() {
      try {
          if (isOnScreen()) {
              console.log('bluetooth/requestscan');
              socket.emit('bluetooth/requestscan');
          } else {
              handle_btdevices_event();
          }
      } catch(err) {
          console.error(error);
      }
      requestScanTimeout = setTimeoutAnimationFrame(requestScan, REQUEST_SCAN_INTERVAL);
  }


  function handle_btdevices_event(devices) {
      console.log('handle btdevices', { devices });
      if (devices === undefined) {
          visible_btdevices = undefined;
          return;
      }
      let filtered_btdevices = [];
      try {
          for (let [address, props] of Object.entries(devices)) {
              if (filter_btdevices && (!props.Name || !props.Name.startsWith('LIT'))) {
                  continue;
              }
              filtered_btdevices.push(props);

              // if (address === connected_address) {
              //     connected_rssi = device.signal;
              // }
          }
      } catch(err) {
          console.error(err);
      }
      console.log({ filtered_btdevices });
      visible_btdevices = filtered_btdevices;
  }


  async function btpair_device(event) {
      if (selected_btdevice) {
          try {
              let data = {
                  address: selected_btdevice.Address
              };
              let response = await fetch200(btpair_request, {
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
      }
  }


  async function btunpair_device(event) {
      if (selected_btdevice) {
          try {
              let data = {
                  address: selected_btdevice.Address
              };
              let response = await fetch200(btunpair_request, {
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
      }
  }


  async function btconnect_device(event) {
      btconnecting = true;
      if (selected_btdevice) {
          try {
              let data = {
                  address: selected_btdevice.Address
              };
              let response = await fetch200(btconnect_request, {
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
      }
      btconnecting = false;
  }


  async function btdisconnect_device(event) {
      btdisconnecting = true;
      if (selected_btdevice) {
          try {
              let data = {
                  address: selected_btdevice.Address
              };
              let response = await fetch200(btdisconnect_request, {
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
      }
      btdisconnecting = false;
  }

  function click_btdevice(event) {
      console.log('click btdevice', event);
      //let btdevice_li = event.target.parentElement;
      let btdevice_li = event.target;
      //let clickssid = btdevice_li.querySelector('.clickssid');
      let clicked_address = btdevice_li.dataset.macAddress;
      let clicked_props;
      for (let props of visible_btdevices) {
          console.log({ props });
          if (props.Address === clicked_address) {
              clicked_props = props;
          }
      }
      if (!clicked_props) {
          console.error('could not find device in visible devices', clicked_mac_address);
          return;
      }
      if (selected_btdevice && selected_btdevice.mac_address === clicked_props.mac_address) {
          selected_btdevice = undefined;
      } else {
          selected_btdevice = clicked_props;
      }
      console.log('selected btdevice', selected_btdevice);
  }
</script>


<div id="btsetup-container">
  <center>
    <div class="btconnect-container">
      <div id="btdevicelist-container">
        <div id="btdevicelist">
          <center>
            <span style="color:darkgray">Visible LED Modules</span>
            <div class="sublabel"><br>LED Modules are visible for<br>10 minutes when turned on</div>
            <br>
          </center>
          <button
            id="filtering"
            type="button"
            on:click={toggle_btdevices_filter}
            >
            {btdevices_filter_icon}
          </button>
          <ul width=300 id="btdevices">
            <center>
              {#if !visible_btdevices}
                <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <span style="color:darkgray">• • •</span></li>
              {:else if visible_btdevices.length === 0}
                <li>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <span style="color:darkgray">none</span></li>
              {:else}
                {#each visible_btdevices as btdevice}
                  <li class="selector" on:click={click_btdevice} data-mac-address={btdevice.Address} data-paired={btdevice.Paired} data-connected={btdevice.Connected}>
                    {#if selected_btdevice && selected_btdevice.Address === btdevice.Address}
                      <div class="btdevice selected" style="position:relative">
                        <div style="position:absolute;color:#AAAAAA;left:-38px">{btdevice.RSSI || ''}</div>
                        <span class="clickbtdevice">{btdevice.Name || btdevice.Address}</span>
                        {#if btdevice.Connected}
                          <span class="connectedbtdevice">connected</span>
                        {:else if btdevice.Paired}
                          <span class="connectedbtdevice">paired</span>
                        {/if}
                      </div>
                    {:else}
                      <div class="btdevice" style="position:relative">
                        <div style="position:absolute;color:#AAAAAA;left:-38px">{btdevice.RSSI || ''}</div>
                        <span class="clickbtdevice">{btdevice.Name || btdevice.Address}</span>
                        {#if btdevice.Connected}
                          <span class="connectedbtdevice">connected</span>
                        {:else if btdevice.Paired}
                          <span class="connectedbtdevice">paired</span>
                        {/if}
                      </div>
                    {/if}
                  </li>
                {/each}
              {/if}
            </center>
          </ul>
        </div>
      </div>

      <br>
      <br>
      {#if selected_btdevice}
        <Button nofeedback on:click={btconnect_device}>
          {#if !btconnecting}
            Pair LED
          {:else}
            Pairing LED...
          {/if}
        </Button>
      {:else}
        <Button nofeedback on:click={btdisconnect_device}>
          {#if !btdisconnecting}
            Disconnect LED
          {:else}
            Disconnecting LED...
          {/if}
        </Button>
      {/if}
      <div class="connect_status">{btconnect_error}</div>
      <br>
      <br>
    </div>

    <Button nofeedback on:click={btpair_device}>Pair</Button><br>
    <Button nofeedback on:click={btunpair_device}>Unpair</Button><br>
    <Button nofeedback on:click={btconnect_device}>Connect</Button><br>
    <Button nofeedback on:click={btdisconnect_device}>Disconnect</Button><br>

    <div id="btconnection">
      {#if !connected_btdevice}
        <span style="color:darkgray">Not Connected</span>
        <br>
        &nbsp;
      {:else}
        <div style="position:relative">
          <span style="color:darkgray">connected to </span>{connected_btdevice.Name || connected_btdevice.Address}
          {#if connected_btrssi}
            &nbsp;<span style="position:absolute;color:#AAAAAA">{connected_btrssi}</span>
          {/if}
        </div>
        {#if connected_btdevice.Address}
          <span style="color:#AAAAAA">{connected_btdevice.macaddress}</span>
        {:else}
          &nbsp;
        {/if}
      {/if}
    </div>

  </center>
</div>


<style>
  #connection {
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
