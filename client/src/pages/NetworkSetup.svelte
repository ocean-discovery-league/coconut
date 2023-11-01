<script>
  export let devicetype;
  import WiFiSetup from '$lib/../pages/WiFiSetup.svelte';
  import BluetoothSetup from '$lib/../pages/BluetoothSetup.svelte';
  import MissionID from '$lib/../pages/MissionID.svelte';
  import { TabList, TabButton, TabContent, TabbedBox } from '$lib/tabs.js';
  import { missionid_data } from '$lib/stores.js';

  let not_loaded = '• • •';
  let hostname;
  let macaddress;
  let version;
  let python_version;

  $: {
      if ($missionid_data) {
          hostname   = $missionid_data.hostname   || not_loaded;
          macaddress = $missionid_data.macaddress || not_loaded;
          python_version = '';
          if ($missionid_data.version) {
              version = 'v' + $missionid_data.version;
              if ($missionid_data.python_version) {
                  python_version = ` (${missionid_data.python_version})`;
              }
          } else {
              version = not_loaded;
          }
      }
  }
</script>

<center>
  <div class="errata">
    <div class="hostname">{hostname}</div>
    <div class="macaddress">{macaddress}</div>
    <div class="version">{version}<span class="python-version">{python_version}</span></div>
  </div>
  <TabbedBox>
    <TabList><TabButton width='175px'>WiFi</TabButton><TabButton width='175px'>Light Module</TabButton><TabButton width='175px'>Mission ID</TabButton></TabList>
    <TabContent>
      <br>
      <WiFiSetup {devicetype}/>
    </TabContent>
    <TabContent>
      <br>
      <BluetoothSetup {devicetype}/>
    </TabContent>
    <TabContent>
      <br>
      <MissionID/>
    </TabContent>
  </TabbedBox>
</center>


<style>
  .errata {
    margin-bottom: 38px;
    font-weight: var(--odl-font-normal);
    color: var(--odl-gray-4);
  }
  .hostname {
    font-weight: var(--odl-font-bold);
  }
</style>  
