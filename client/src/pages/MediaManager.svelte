<script>
  import { onMount, onDestroy } from 'svelte';
  //import { dev } from '$app/environment';
  import FileCounts from '$widgets/FileCounts.svelte';
  import TransferFiles from '$panels/TransferFiles.svelte';
  import fileCountsModel from '$models/fileCountsModel.js';
  import { getSocketIO } from '$lib/misc.js';

  let socket;
  let iframe_src;

  onMount(() => {
      let iframe_root = window.location.protocol + '//' + window.location.hostname;
      if (window.location.port) {
          iframe_root += ':' + window.location.port;
      }
      iframe_src = iframe_root + '/html/preview.php';

      socket = getSocketIO();
      //socket.on('uploadall/filecounts', (data) => update_file_counts(data));
      fileCountsModel.init(socket, 'uploadall/filecounts');
  });
</script>


<center>
  <FileCounts store={fileCountsModel}/>
  <div class="transfer-container">
    <TransferFiles/>
  </div>
</center>

<iframe class="mediamanager" title="Media Manager Files" src={iframe_src}>
</iframe>


<style>
  .transfer-container {
    height: 260px;
    margin-top: 40px;
    color: white;
    font-size: 20px;
    line-height: 22px;
  }

  .mediamanager {
    width: 100%;
    height: calc(100vh - (240px + 160px));
  }
</style>
