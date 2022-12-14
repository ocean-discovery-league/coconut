<script>
  import { onMount, onDestroy } from 'svelte';
  import { getSocketIO } from '$lib/utils';
  import { dev } from '$app/env';
  import Button from '$lib/Button.svelte';

  let socket;
  let iframe_src;
  let uploadall_request;
  let uploadallcancel_request;

  onMount(() => {
      iframe_src = window.location.protocol + '//' + window.location.hostname + '/html/preview.php';
      uploadall_request       = new Request('/uploadall', {method: 'POST'});
      uploadallcancel_request = new Request('/uploadall_cancel', {method: 'POST'});

      if (dev) {
          // for dev on mac
          let root = 'http://192.168.10.1';
          iframe_src  = root + '/html/preview.php';
          // uploadall_request       = new Request(root + '/uploadall', {method: 'POST'});
          // uploadallcancel_request = new Request(root + '/uploadall_cancel', {method: 'POST'});
      }
      
      socket = getSocketIO();
      socket.on('filecounts',     (data) => update_file_counts(data));
      socket.on('uploadstarted',  (data) => update_upload_started(data));
      socket.on('uploadprogress', (data) => update_upload_progress(data));
      socket.on('uploadfinished', (data) => update_upload_finished(false, data));
      socket.on('uploaderror',    (data) => update_upload_finished(data, false));
  });

  let uploading = false;
  let uploading_error = false;
  let uploading_response = false;
  let canceling = false;
  let canceled = false;
  let filecounts;
  let filecounts_summary;
  let uploading_summary = '';

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
              let response = await fetch(uploadall_request);
              
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
              let response = await fetch(uploadallcancel_request);
              
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
          filecounts_summary = '??? ??? ???';
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
      let text = `Uploading ${data.n+1} of ${data.of+1} ${data.ext}${data.of===1?'':'s'}`;
      return text;
  }
</script>

<center>
  <div class="upload-container">
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={upload_all}>
      {#if uploading}
        {#if canceling}
          Canceling...
        {:else}
          Cancel Upload
        {/if}
      {:else}
        Upload All Files To Tator.io
      {/if}
    </Button>
    <div class="uploadstatus">
      {#if uploading}
        {#if uploading_summary}
          {uploading_summary}
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
    <div class="filecounts">{filecounts_summary}</div>
  </div>
</center>

<iframe class="mediamanager" title="Media Manager Files" src={iframe_src}>
</iframe>


<style>
  .upload-container {
    height: 140px;
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
    height: calc(100vh - (120px + 151px));
  }

  .error {
    color: #DD2C1D;
  }
</style>
