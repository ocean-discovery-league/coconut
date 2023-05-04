<script>
  export let devicetype;

  import { onMount, onDestroy } from 'svelte';
  import { isOnScreen, fetch200, getSocketIO, setTimeoutAnimationFrame } from '$lib/misc.js';
  //import { dev } from '$app/environment'
  import Button from '$lib/Button.svelte';

  const REQUEST_DISCOVERY_INTERVAL_MS = 5 * 1000;  // 5 seconds, server stops after 20 seconds with no request
  const REBOOTING_BUTTON_RESET_TIMEOUT_MS = 25 * 1000;  // 25 seconds

  let bluetoothSetup;
  let requestDiscoveryTimeout;
  let onscreen_section;

  let socket;
  let pair_request;
  let remove_request;
  let reboot_request;
  // let connect_request;
  // let disconnect_request;

  let pairing;
  let bluetooth_error = '';
  let removing;
  let removed;
  let rebooting;

  let selected_device;
  let paired_devices = false;
  let visible_devices = false;

  onMount(() => {
      socket = getSocketIO();
      // socket.onAny( (eventName, ...args) => {
      //     console.log('socket event', eventName, ...args);
      // });
      socket.on('bluetooth/devices', (...args) => handle_devices_event(...args));
      pair_request = new Request('/api/v1/bluetooth/pair');
      remove_request = new Request('/api/v1/bluetooth/remove');
      reboot_request = new Request('/api/v1/rover/reboot');
      // connect_request = new Request('/api/v1/bluetooth/connect');
      // disconnect_request = new Request('/api/v1/bluetooth/disconnect');

      requestDiscovery();
  });


  onDestroy(() => {
      clearTimeout(requestDiscoveryTimeout);
  });


  let filter_devices = true;
  let devices_filter_icon;
  $: devices_filter_icon = filter_devices ? '👁️' : '😆';
  function toggle_devices_filter(event) {
      filter_devices = !filter_devices;
      event.preventDefault();  // keep from stealing keyboard focus
  }


  async function requestDiscovery() {
      try {
          if (isOnScreen(bluetoothSetup)) {
              console.log('bluetooth/requestdiscovery', socket);
              socket.emit('bluetooth/requestdiscovery');
          } else {
              handle_devices_event();
          }
      } catch(err) {
          console.error(error);
      }
      requestDiscoveryTimeout = setTimeoutAnimationFrame(requestDiscovery, REQUEST_DISCOVERY_INTERVAL_MS);
  }


  function handle_devices_event(devices) {
      console.log('handle bluetooth devices', { devices });
      if (devices === undefined) {
          paired_devices = undefined;
          visible_devices = undefined;
          return;
      }
      paired_devices = [];
      let filtered_devices = [];
      try {
          for (let [address, props] of Object.entries(devices)) {
              if (props.Paired) {
                  paired_devices.push(props);
                  continue;
              }
              if (filter_devices && (!props.Name || !props.Name.startsWith('LIT'))) {
                  continue;
              }
              // if (!props.RSSI) {
              //     continue;
              // }
              filtered_devices.push(props);
          }
      } catch(err) {
          console.error(err);
      }
      visible_devices = filtered_devices;
      console.log({ paired_devices });
      console.log({ visible_devices });
  }


  async function pair_device(event) {
      if (selected_device) {
          try {
              let data = {
                  address: selected_device.Address
              };
              let response = await fetch200(pair_request, {
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


  async function remove_device(event) {
      let device = paired_devices[0];
      if (device) {
          console.log('removing device', device.Address);
          removing = true;
          try {
              let data = {
                  address: device.Address
              };
              let response = await fetch200(remove_request, {
                  method: 'POST',
                  body: JSON.stringify(data),
                  headers: {
                      'Content-Type': 'application/json'
                  }
              });
              let result = await response.text();
              console.log('result', result);
              removed = true;
          } catch(err) {
              console.error(err);
          }
          removing = false;
          selected_device = false;
      }
  }


  async function connect_device(event) {
      connecting = true;
      if (selected_device) {
          try {
              let data = {
                  address: selected_device.Address
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
      }
      connecting = false;
  }


  async function disconnect_device(event) {
      disconnecting = true;
      if (selected_device) {
          try {
              let data = {
                  address: selected_device.Address
              };
              let response = await fetch200(disconnect_request, {
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
      disconnecting = false;
  }

  function click_device(event) {
      console.log('click bluetooth device', event);
      //let device_li = event.target.parentElement;
      let device_li = event.target;
      //let clickssid = device_li.querySelector('.clickssid');
      let clicked_address = device_li.dataset.macAddress;
      let clicked_props;
      for (let props of visible_devices) {
          console.log({ props });
          if (props.Address === clicked_address) {
              clicked_props = props;
          }
      }
      if (!clicked_props) {
          console.error('could not find device in visible devices', clicked_mac_address);
          return;
      }
      if (selected_device && selected_device.mac_address === clicked_props.mac_address) {
          selected_device = undefined;
      } else {
          selected_device = clicked_props;
      }
      console.log('selected bluetooth device', selected_device);
  }

  async function reboot(event) {
      console.log('rebooting...');
      rebooting = true;
      try {
          await fetch200(reboot_request, { method: 'POST' });
      } catch(err) {
          console.error('error requesting reboot', err);
      }
      selected_device = false;
      visible_devices = false;
      paired_devices = false;
      await new Promise((resolve) => setTimeout(resolve, REBOOTING_BUTTON_RESET_TIMEOUT_MS));
      console.log('resetting rebooting flag');
      rebooting = false;
      removed = false;
  }
</script>


<div id="setup-container" bind:this={bluetoothSetup}>
  <center>
    <div class="connect-container">
      <div id="devicelist-container">
        <div id="devicelist">
          {#if paired_devices && paired_devices.length}
            <center>
              <span style="color:darkgray">Paired LED Module</span>
              <br>
              <br>
            </center>
            <ul width=300 id="devices">
              <center>
                {#each paired_devices as device}
                  <li class="selector">
                    <div class="device" style="position:relative">
                      <span class="clickdevice">{device.Name || device.Address}</span>
                    </div>
                  </li>
                {/each}
              </center>
            </ul>
            <br>
            <br>
            <br>
            <Button nofeedback on:click={remove_device}>
              {#if !removing}
                Remove LED
              {:else}
                Removing LED...
              {/if}
            </Button>
          {:else}
            <center>
              {#if removed}
                <div class="sublabel"><br>To re-pair the recently removed device<br>You will need to reboot this Maka Niu</div>
                <br>
                  <Button nofeedback dangerous height=30 width=150 on:click={reboot}>
                    {#if !rebooting}
                      Reboot
                    {:else}
                      Rebooting...
                    {/if}
                  </Button>
                <br>
              {/if}
              <div class="sublabel"><br>LED Modules are only visible<br>when ring is on "network"<br><br></div>
              <span style="color:darkgray">Visible LED Modules</span>
              <br>
              <br>
            </center>
            <!--
            <button
              id="filtering"
              type="button"
              on:click={toggle_devices_filter}
              >
              {devices_filter_icon}
            </button>
            -->
            <ul width=300 id="devices">
              <center>
                {#if !visible_devices}
                  <li><span style="color:darkgray">• • •</span></li>
                {:else if visible_devices.length === 0}
                  <li><span style="color:darkgray">none</span></li>
                {:else}
                  {#each visible_devices as device}
                    <li class="selector" on:click={click_device} data-mac-address={device.Address} data-paired={device.Paired} data-connected={device.Connected}>
                      <div class="device {(selected_device && selected_device.Address === device.Address) ? 'selected' : ''}" style="position:relative">
                        <!--
                        <div style="position:absolute;color:#AAAAAA;left:-38px">{device.RSSI || ''}</div>
                        -->
                        <span class="clickdevice">{device.Name || device.Address}</span>
                        <!--
                        {#if device.Connected}
                          <span class="connecteddevice">connected</span>
                        {:else if device.Paired}
                          <span class="connecteddevice">paired</span>
                        {/if}
                        -->
                      </div>
                    </li>
                  {/each}
                {/if}
              </center>
            </ul>
            <br>
            <br>
            {#if selected_device}
              <Button nofeedback on:click={pair_device}>
                {#if !pairing}
                  Pair LED
                {:else}
                  Pairing LED...
                {/if}
              </Button>
            {/if}
          {/if}
        </div>
      </div>
      <br>
      <br>
      <div class="bluetooth-error">{bluetooth_error}</div>
    </div>

    <!--
    <Button nofeedback on:click={pair_device}>Pair</Button><br>
    <Button nofeedback on:click={remove_device}>Remove</Button><br>
    <Button nofeedback on:click={connect_device}>Connect</Button><br>
    <Button nofeedback on:click={disconnect_device}>Disconnect</Button><br>
    -->

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
