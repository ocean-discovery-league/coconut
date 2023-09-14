<script>
  export let transferring = false;

  import { onMount, onDestroy } from 'svelte';
  import Button from '$lib/Button.svelte';
  import ProgressBar from '$lib/ProgressBar.svelte';
  import ProgressCircle from '$lib/ProgressCircle.svelte';
  import downloadingModel from '$models/downloadingModel.js';
  import { fetch200, getSocketIO } from '$lib/misc.js';

  let socket;
  let download_all_url;
  let download_logs_url;
  let download_cancel_url;

  onMount(() => {
      download_all_url    = '/api/v1/download/all';
      download_logs_url   = '/api/v1/download/logs';
      download_cancel_url = '/api/v1/download/cancel';

      socket = getSocketIO();
      socket.on('downloadall/started',    (data) => update_download_started(data));
      socket.on('downloadall/progress',   (data) => update_download_progress(data));
      socket.on('downloadall/finish',     (data) => update_download_finish(false, data));
      socket.on('downloadall/error',      (data) => update_download_finish(data, false));

      //downloadingModel.init(socket, 'downloadall/progress');
      socket.on('downloadall/progress', (data) => {
          update_download_started();
          update_download_progress(data);
      });
  });

  let canceling = false;
  let canceled = false;
  let finished = false;
  let downloading = false;
  let downloading_error = false;
  let downloading_response = false;
  let download_fraction = 0;
  let downloading_summary = '';
  let downloading_file_name = '';
  let downloading_file_fraction = 0;


  async function download_a_url(url) {
      console.log('downloading', url);
      downloading = true;
      transferring = true;
      finished = false;
      //window.location = download_logs_url;
      // let a = document.createElement('a');
      // a.download = true;
      // a.href = download_logs_url;
      // a.click();
      let iframe = document.createElement('iframe');
      iframe.src = url;
      // let html = '<'+'html>'+'<'+'body></body>'+'<'+'script>window.location="'
      //     + download_logs_url
      //     + '";<'+'/script>'+'<'+'/body>'+'<'+'/html>';
      // iframe.srcdoc = html;
      document.body.append(iframe);
  }


  function update_download_started(data) {
      if (!canceling && !finished) {
          downloading = true;
          transferring = true;
          downloading_error = false;
          downloading_response = false;
          downloading_summary = false;
          canceling = false;
          canceled = false;
      }
  }
  

  function update_download_progress(data) {
      //console.log('progress', data);
      if (!downloading && !canceling && !finished) {
          console.log('truing');
          downloading = true;
          transferring = true;
          downloading_error = false;
          downloading_response = false;
          downloading_summary = false;
          canceling = false;
          canceled = false;
      }
      download_counts_summary_text(data);
  }


  function download_counts_summary_text(data) {
      let text = '';
      if (data.bytesTotal > 0) {
          downloading_file_name = '';
          if (data.fileName) {
              let parts = data.fileName.split('/');
              downloading_file_name = parts[parts.length-1];
          }
          text = `Downloading ${data.filesDone} of ${data.filesTotal}`;
          if (data.bytesTotal && data.bytesTotal > 0) {
              download_fraction = data.bytesDone / data.bytesTotal;
          } else {
              download_fraction = 0;
          }
          //downloading_file_fraction = download_fraction;
          downloading_file_fraction = data.fileBytesDone / data.fileBytesTotal;
      }
      downloading_summary = text;
  }


  function start_download() {
      if (!downloading && !transferring) {
          download_a_url(download_all_url);
      } else {
          console.error('transfer in progress');
      }
  }


  async function cancel_download() {
      if (downloading) {
          canceling = true;
          let request = new Request(download_cancel_url, { method: 'POST' });
          let response = await fetch(request);
          console.log('download cancel response', response);
      } else {
          console.error('no download in progress');
      }
  }

  function update_download_finish(err, message) {
      console.log('update_download_finish', err, message);
      downloading = false;
      transferring = false;
      canceling = false;
      finished = true;
      if (err) {
          downloading_error = `Download error: ${err}`;
          downloading_response = false;
      } else {
          downloading_error = false;
          downloading_response = message || 'Download done!';
      }      
  }
</script>


<div class="tabsection selected" data-name="download">
  {#if !downloading && !canceling}
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={start_download}>Download All Files</Button>
  {:else}
    {#if canceling}
      Canceling...
    {:else}
      <Button width=280 height=36 fontsize='16px' nofeedback on:click={cancel_download}>Cancel Download</Button>
      
    {/if}
  {/if}
  <div style='height:24px'></div>
  <div class="downloadstatus">
    {#if downloading}
      {#if downloading_summary}
        {downloading_summary}
        <br>
        <ProgressBar fraction={download_fraction}/>
        <div style="height:2px"></div>
        <ProgressCircle width=24 fraction={downloading_file_fraction}/>
        {downloading_file_name}
      {:else}
        Downloading...
      {/if}
    {:else}
      {#if canceled}
        Downloading canceled
      {:else if downloading_error}
        <span class="error">{downloading_error}</span>
      {:else if downloading_response}
        {downloading_response}
      {:else}
        {downloading_summary}
      {/if}
    {/if}
  </div>
</div>
