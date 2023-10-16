<script>
  export let devicetype;
  import WiFiSetup from '$lib/../pages/WiFiSetup.svelte';
  import BluetoothSetup from '$lib/../pages/BluetoothSetup.svelte';
  import { TabList, TabButton, TabContent, TabbedBox } from '$lib/tabs.js';
</script>


<center>
  <TabbedBox>
    <TabList><TabButton>WiFi</TabButton><TabButton>Bluetooth</TabButton></TabList>
    <TabContent>
      <WiFiSetup {devicetype}/>
    </TabContent>
    <TabContent>
      <BluetoothSetup {devicetype}/>
    </TabContent>
  </TabbedBox>
</center>
