<script>
  import { onMount, onDestroy } from 'svelte';
  import { getSocketIO } from '$lib/utils';

  onMount(() => {
      let socket = getSocketIO();
      socket.on('cam.jpg', (image) => {
	  let url = 'data:image/jpeg;base64,' + btoa(data.buffer);
	  console.log('url', url);
	  document.querySelector('#camview').src = url;
      });
  });
</script>

<!--
    <label for="fps">Frames per second</label>
    <select name="fps">
      <option>12</option>
      <option selected="true">24</option>
      <option>30</option>
    </select>
-->

    <br>
    <br>

    <img id="camview" width="512" height="288">
    
    <h2 style="font-size:22px">All settings are currently automatic</h2>
