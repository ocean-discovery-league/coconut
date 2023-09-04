<script>
  import { onMount, onDestroy } from 'svelte';
  //import { dev } from '$app/environment';
  import Button from '$lib/Button.svelte';
  import ProgressBar from '$lib/ProgressBar.svelte';
  import ProgressCircle from '$lib/ProgressCircle.svelte';
  import { fetch200, getSocketIO } from '$lib/misc.js';

  let socket;
  let iframe_src;
  let download_all_url;
  let download_logs_url;
  let uploadall_request;
  let uploadallcancel_request;

  onMount(() => {
      let iframe_root = window.location.protocol + '//' + window.location.hostname;
      if (window.location.port) {
          iframe_root += ':' + window.location.port;
      }
      iframe_src = iframe_root + '/html/preview.php';
      download_all_url        = '/api/v1/download/all';
      download_logs_url       = '/api/v1/download/logs';
      uploadall_request       = new Request('/api/v1/uploadall', {method: 'POST'});
      uploadallcancel_request = new Request('/api/v1/uploadall/cancel', {method: 'POST'});

      socket = getSocketIO();
      socket.on('uploadall/filecounts', (data) => update_file_counts(data));
      socket.on('uploadall/started',    (data) => update_upload_started(data));
      socket.on('uploadall/progress',   (data) => update_upload_progress(data));
      socket.on('uploadall/finished',   (data) => update_upload_finished(false, data));
      socket.on('uploadall/error',      (data) => update_upload_finished(data, false));

      socket.on('downloadall/progress', (data) => {
      update_download_started();
      update_download_progress(data);
      });
  });

  let uploading = false;
  let uploading_error = false;
  let uploading_response = false;
  let canceling = false;
  let canceled = false;
  let filecounts;
  let filecounts_summary;
  let upload_fraction = '0';
  let uploading_summary = '';
  let downloading = false;
  let downloading_error = false;
  let downloading_response = false;
  let download_fraction = 0;
  let downloading_summary = '';
  let downloading_file_name = '';
  let downloading_file_fraction = 0;

  async function download_a_url(url) {
      console.log('downloading', url);
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


  async function upload_all(event) {
      if (!uploading) {
          try {
              console.log('upload all!');
              uploading = true;
              uploading_error = false;
              uploading_response = false;
              uploading_summary = false;
              canceling = false;
              canceled = false;
              let response = await fetch200(uploadall_request);
              
              uploading = false;
              if (response.ok) {
                  let text = await response.text();
                  console.log('upload response text', text);
                  update_upload_finished(false, text);
              } else {
                  update_upload_finished(response.statusText);
              }
          } catch(err) {
              update_upload_finished(err, false);
          }
      } else {
          upload_all_cancel(event);
      }
  }


  async function upload_all_cancel(event) {
      if (uploading) {
          try {
              console.warn('upload all canceled!');
              canceling = true;
              let response = await fetch200(uploadallcancel_request);
              
              uploading = false;
              if (response.ok) {
                  canceling = false;
                  canceled = true;
              } else {
                  uploading_error = `Upload cancel error: ${response.statusText}`;
              }
          } catch(err) {
              uploading = false;
              uploading_error = `Upload error: ${err}`;
          }
      }
  }


  $: {
      if (filecounts) {
          filecounts_summary = file_counts_summary_text(filecounts);
      } else {
          filecounts_summary = '• • •';
      }
  }


  function update_file_counts(data) {
      if (!uploading) {
          filecounts = data.filecounts;
      }
  }


  function update_upload_started(data) {
      uploading = true;
      uploading_error = false;
      uploading_response = false;
      uploading_summary = false;
      canceling = false;
      canceled = false;
      filecounts = data.filecounts;
  }
  

  function update_upload_progress(data) {
      console.log('progress', data);
      if (!uploading) {
          uploading = true;
          uploading_error = false;
          uploading_response = false;
          uploading_summary = false;
          canceling = false;
          canceled = false;
      }
      filecounts = data.filecounts;
      uploading_summary = upload_counts_summary_text(data);
  }


  function update_upload_finished(err, message) {
      uploading = false;
      if (err) {
          uploading_error = `Upload error: ${err}`;
          uploading_response = false;
      } else {
          uploading_error = false;
          uploading_response = message || 'Upload done!';
      }      
  }


  function file_counts_summary_text(filecounts) {
      let txts  = filecounts.txt || 0;
      let jpgs  = filecounts.jpg || 0;
      let mp4s  = filecounts.mp4 || 0;

      let text = `${txts} txt${txts===1?'':'s'},
                  ${jpgs} jpg${jpgs===1?'':'s'},
                  ${mp4s} mp4${mp4s===1?'':'s'}`;

      let h264s = filecounts.h264 || 0;
      if (filecounts.h264) {
          text += `, ${h264s} h264${h264s===1?'':'s'}`;
      }

      return text;
  }


  function upload_counts_summary_text(data) {
      let text = '';
      if (data.of > 0) {
          text = `Uploading ${data.n+1} of ${data.of} ${data.ext}${data.of===1?'':'s'}`;
          upload_fraction = data.n / data.of;
      }
      return text;
  }


  function update_download_started(data) {
      downloading = true;
      downloading_error = false;
      downloading_response = false;
      downloading_summary = false;
      canceling = false;
      canceled = false;
  }
  

  function update_download_progress(data) {
      console.log('progress', data);
      if (!downloading) {
          downloading = true;
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
          download_fraction = data.bytesDone / data.bytesTotal;
          //downloading_file_fraction = download_fraction;
          downloading_file_fraction = data.fileBytesDone / data.fileBytesTotal;
      }
      downloading_summary = text;
  }
</script>


<center>
  <div class="upload-container">
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={() => {download_a_url(download_all_url)}}>
      {#if !downloading}
        Download All Files
      {:else}
        {#if canceling}
          Canceling...
        {:else}
          Cancel Download
        {/if}
      {/if}
    </Button>
    <div style='height:24px'></div>
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={() => {download_a_url(download_logs_url)}}>
        Download Sensor Logs
    </Button>
    <div style='height:24px'></div>
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={upload_all}>
      {#if !uploading}
        Upload All Files To Tator.io
      {:else}
        {#if canceling}
          Canceling...
        {:else}
          Cancel Upload
        {/if}
      {/if}
    </Button>
    <div class="uploadstatus">
      {#if uploading}
        {#if uploading_summary}
          {uploading_summary}
          <br>
          <ProgressBar fraction={upload_fraction}/>
        {:else}
          Uploading...
        {/if}
      {:else}
        {#if canceled}
          Uploading canceled
        {:else if uploading_error}
          <span class="error">{uploading_error}</span>
        {:else if uploading_response}
          {uploading_response}
        {:else}
          {uploading_summary}
        {/if}
      {/if}
    </div>
    <div class="downloadstatus">
      {#if downloading}
        {#if downloading_summary}
          <ProgressBar fraction={download_fraction}/>
          <div style="height:5px"></div>
          {downloading_summary}
          <br>
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
    <div class="filecounts">{filecounts_summary}</div>
  </div>
</center>

<iframe class="mediamanager" title="Media Manager Files" src={iframe_src}>
</iframe>


<style>
  .upload-container {
    height: 260px;
    color: white;
    font-size: 20px;
    line-height: 22px;
  }

  .uploadstatus {
    margin-top: 10px;
    height: 1.1em;
  }

  .filecounts {
    color: gray;
    margin-top: 5px;
  }

  .mediamanager {
    width: 100%;
    height: calc(100vh - (240px + 160px));
  }

  .error {
    color: #DD2C1D;
  }
</style>
