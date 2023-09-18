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
      //socket.on('download/started',    (data) => update_download_started(data));
      socket.on('download/progress',   (data) => update_download_progress(data));
      socket.on('download/warning',    (data) => update_download_warning(data));
      socket.on('download/error',      (data) => update_download_finish(data, false));
      socket.on('download/finish',     (data) => update_download_finish(false, data));
  });

  let canceled = false;
  let downloading_error = false;
  let downloading_response = false;
  let download_fraction = 0;
  let downloading_summary = false;
  let downloading_estimate = false;
  let downloading_file_name = '';
  let downloading_file_fraction = 0;


  async function download_a_url(url) {
      console.log('downloading', url);
      update_download_started();
      let iframe = document.createElement('iframe');
      iframe.src = url;
      document.body.append(iframe);
  }


  function update_download_started() {
      transferring = true;
      canceled = false;
      downloading_error = false;
      downloading_response = false;
      downloading_summary = false;
      downloading_estimate = false;
  }
  

  function update_download_progress(data) {
      //console.log('progress', data);
      if (!transferring) {
          update_download_started();
      }
      download_counts_summary_text(data);
  }


  let timeOfLastEstimate;
  function download_counts_summary_text(data) {
      let text = '';
      if (data.bytesTotal > 0) {
          downloading_file_name = '';
          if (data.fileName) {
              let parts = data.fileName.split('/');
              downloading_file_name = parts[parts.length-1];
          }
          text = `Downloading ${data.filesDone+1} of ${data.filesTotal}`;
          if (data.bytesTotal && data.bytesTotal > 0) {
              download_fraction = data.bytesDone / data.bytesTotal;
          } else {
              download_fraction = 0;
          }
          downloading_file_fraction = data.fileBytesDone / data.fileBytesTotal;

          let now = Date.now();
          if (!timeOfLastEstimate && data.elapsedTime > 5 * 1000
              || now - timeOfLastEstimate > 5 * 1000)
          {
              timeOfLastEstimate = now;
              let estimated_ms = (1 - download_fraction) * data.elapsedTime;
              downloading_estimate = format_time(estimated_ms);
          }
      }
      downloading_summary = text;
  }


  function format_time(ms, minlen = 4) {
      let seconds = parseInt(ms / 1000);
      let hours = parseInt(seconds / 3600);
      seconds = seconds % 3600;

      let minutes = parseInt(seconds / 60);
      seconds = parseInt(seconds % 60);

      if (seconds < 10) {
          seconds = '0' + seconds;
      } else {
          seconds = '' + seconds;
      }

      if (minutes < 10 && (hours > 0 || minlen > 4)) {
          minutes = '0' + minutes;
      } else {
          minutes = '' + minutes;
      }

      // if (hours || minlen > 6) {
      //     return `${hours}:${minutes}:${seconds}`;
      // } else {
      //     return `${minutes}:${seconds}`;
      // }

      if (hours < 1) {
          if (minutes < 1) {
              return `1 min`;
          } else {
              return `${minutes} mins`;
          }
      } else {
          return `${hours} hours ${minutes} mins`;
      }
  };


  function start_download() {
      if (!transferring && !transferring) {
          download_a_url(download_all_url);
      } else {
          console.error('transfer in progress');
      }
  }


  async function cancel_download() {
      if (transferring) {
          transferring = false;
          canceled = true;
          let request = new Request(download_cancel_url, { method: 'POST' });
          let response = await fetch(request);
          console.log('download cancel response', response);
      } else {
          console.error('no download in progress');
      }
  }


  function update_download_warning(message) {
      console.log('update_download_warning', message);
      downloading_error = `Download warning: ${message}`;
  }


  function update_download_finish(err, message) {
      console.log('update_download_finish', err, message);
      transferring = false;
      canceled = false;
      if (err) {
          if (err === 'canceled') {
              downloading_error = `Download canceled`;
          } else {
              downloading_error = `Download error: ${err}`;
          }
          downloading_response = false;
      } else {
          downloading_error = false;
          downloading_response = message || 'Download finished!';
      }      
  }
</script>


{#if !transferring && !canceled}
  <Button width=280 height=36 fontsize='16px' nofeedback on:click={start_download}>Download All Files</Button>
{:else}
  {#if canceled}
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={cancel_download}>Canceling...</Button>
  {:else}
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={cancel_download}>Cancel Download</Button>
  {/if}
{/if}

<div class="downloadstatus">
  {#if transferring}
    {#if downloading_summary}
      {downloading_summary}{#if downloading_estimate}<span class="estimate">{downloading_estimate}</span>{/if}
      <br>
      <ProgressBar fraction={download_fraction}/>
      <div style="height:2px"></div>
      <ProgressCircle width=24 fraction={downloading_file_fraction}/>
      <span class="filename">{downloading_file_name}</span>
    {:else}
      Downloading...
    {/if}
  {:else}
    {#if downloading_response}
      {downloading_response}
    {:else}
      {#if downloading_summary}
        {downloading_summary}
      {/if}
    {/if}
  {/if}
  {#if downloading_error}
    <div style="height:8px"></div>
    <div class="error">{downloading_error}</div>
  {/if}
</div>


<style>
  .downloadstatus {
    margin-top: 24px;
    height: 1.1em;
  }

  .estimate {
    display: inline-block;
    margin-left: 10px;
    color: grey;
  }

  .filename {
    color: grey;
  }

  .error {
    color: #DD2C1D;
  }
</style>
