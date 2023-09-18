<script>
  export let transferring = false;

  import { onMount, onDestroy } from 'svelte';
  import Button from '$lib/Button.svelte';
  import ProgressBar from '$lib/ProgressBar.svelte';
  import { fetch200, getSocketIO } from '$lib/misc.js';

  let socket;
  let uploadall_request;
  let uploadallcancel_request;

  onMount(() => {
      uploadall_request       = new Request('/api/v1/uploadall', {method: 'POST'});
      uploadallcancel_request = new Request('/api/v1/uploadall/cancel', {method: 'POST'});

      socket = getSocketIO();
      socket.on('uploadall/started',  (data) => update_upload_started(data));
      socket.on('uploadall/progress', (data) => update_upload_progress(data));
      socket.on('uploadall/finish',   (data) => update_upload_finish(false, data));
      socket.on('uploadall/error',    (data) => update_upload_finish(data, false));
  });

  let uploading = false;
  let uploading_error = false;
  let uploading_response = false;
  let canceling = false;
  let canceled = false;
  let upload_fraction = '0';
  let uploading_summary = '';
  let filecounts;

  async function upload_all(event) {
      if (!uploading) {
          try {
              console.log('upload all!');
              uploading = true;
              transferring = true;
              uploading_error = false;
              uploading_response = false;
              uploading_summary = false;
              canceling = false;
              canceled = false;
              let response = await fetch200(uploadall_request);
              
              uploading = false;
              transferring = false;
              if (response.ok) {
                  let text = await response.text();
                  console.log('upload response text', text);
                  update_upload_finish(false, text);
              } else {
                  update_upload_finish(response.statusText);
              }
          } catch(err) {
              update_upload_finish(err, false);
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
              transferring = false;
              if (response.ok) {
                  canceling = false;
                  canceled = true;
              } else {
                  uploading_error = `Upload cancel error: ${response.statusText}`;
              }
          } catch(err) {
              uploading = false;
              transferring = false;
              uploading_error = `Upload error: ${err}`;
          }
      }
  }


  function update_upload_started(data) {
      uploading = true;
      transferring = true;
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
          transferring = true;
          uploading_error = false;
          uploading_response = false;
          uploading_summary = false;
          canceling = false;
          canceled = false;
      }
      filecounts = data.filecounts;
      uploading_summary = upload_counts_summary_text(data);
  }


  function update_upload_finish(err, message) {
      uploading = false;
      transferring = false;
      if (err) {
          uploading_error = `Upload error: ${err}`;
          uploading_response = false;
      } else {
          uploading_error = false;
          uploading_response = message || 'Upload done!';
      }      
  }


  function upload_counts_summary_text(data) {
      let text = '';
      if (data.of > 0) {
          text = `Uploading ${data.n+1} of ${data.of} ${data.ext}${data.of===1?'':'s'}`;
          upload_fraction = data.n / data.of;
      }
      return text;
  }
</script>


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


<style>
  .uploadstatus {
    margin-top: 24px;
    height: 1.1em;
  }

  .error {
    color: #DD2C1D;
  }
</style>
