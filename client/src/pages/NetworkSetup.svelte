<script>
  export let devicetype;
  import WiFiSetup from '$lib/../pages/WiFiSetup.svelte';
  import BluetoothSetup from '$lib/../pages/BluetoothSetup.svelte';
</script>


<center>
  <WiFiSetup {devicetype}/>
  <br>
  <hr>
  <br>
  <br>
  <BluetoothSetup {devicetype}/>
</center>
