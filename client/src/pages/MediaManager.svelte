<script>
  import { onMount, onDestroy } from 'svelte';
  import { getSocketIO } from '$lib/utils';
  import { dev } from '$app/env';
  import Button from '$lib/Button.svelte';

  let socket;

  onMount(() => {
    let mediamanager = document.getElementById('mediamanager');
    mediamanager.src = window.location.protocol + '//' + window.location.hostname + '/html/preview.php';
    if (dev) {
      mediamanager.src = 'http://mkn0014.local/html/preview.php';  // for dev on mac
    }
    
    socket = getSocketIO();
    socket.on('filecounts', (data) => update_file_counts(data));
    socket.on('uploadprogress', (data) => update_upload_progress(data));
  });

  let uploading = false;

  async function upload_all(event) {
    let uploadall_button = document.querySelector('#uploadall');
    let uploadstatus_div = document.querySelector('#uploadstatus');
    if (!uploading) {
      try {
	console.log('upload all!');
	uploadall_button.innerText = '  Cancel Upload ';
	uploadstatus_div.innerText = 'Uploading...';
	uploading = true;
	let response = await fetch('/uploadall', {
	  method: 'POST',
	  //body: JSON.stringify(json),
	  headers: {
	    'Content-Type': 'application/json'
	  }
	});
	
	uploading = false;
	uploadall_button.innerText = 'Upload All Files To Tator.io';
	if (response.ok) {
	  let text = await response.text();
	  console.log('text', text);
	  if (!text) {
	    text = 'Upload done!';
	  }
	  uploadstatus_div.innerText = text;
	} else {
	  uploadstatus_div.innerText = `Upload error: ${response.statusText}`;
	}
      } catch(err) {
	uploading = false;
	uploadall_button.innerText = 'Upload All Files To Tator.io';
	uploadstatus_div.innerText = `Upload error: ${err}`;
      }
    } else {
      upload_all_cancel(event);
    }
  }


  async function upload_all_cancel(event) {
    let uploadall_button = document.querySelector('#uploadall');
    let uploadstatus_div = document.querySelector('#uploadstatus');
    if (uploading) {
      try {
	console.log('upload all cancel!');
	uploadall_button.innerText = 'Canceling...';
	//uploadstatus_div.innerText = 'Uploading...';
	let response = await fetch('/uploadall_cancel', { method: 'POST' });
	
	uploading = false;
	uploadall_button.innerText = 'Upload All';
	if (response.ok) {
	  uploadstatus_div.innerText = 'Upload canceled';
	} else {
	  uploadstatus_div.innerText = `Upload cancel error: ${response.statusText}`;
	}
      } catch(err) {
	uploading = false;
	uploadall_button.innerText = 'Upload All';
	uploadstatus_div.innerText = `Upload error: ${err}`;
      }
    }
  }


  function update_file_counts(data) {
    if (!uploading) {
      let filecounts_div = document.querySelector('#filecounts');
      let summary = file_counts_summary_text(data);
      filecounts_div.innerText = summary;
    }
  }


  function file_counts_summary_text(filecounts) {
    let jpg = filecounts.jpg || 0;
    let mp4 = filecounts.mp4 || 0;
    let h264 = filecounts.h264 || 0;
    let text = `${filecounts.txt} txts, ${filecounts.jpg||0} jpgs, ${filecounts.mp4||0} mp4s`;
    // if (filecounts.h264) {
    //     text += ` ${filecounts.h264} h264`;
    // }
    return text;
  }


  function update_upload_progress(data) {
    if (uploading) {
      let uploadstatus_div = document.querySelector('#uploadstatus');
      let filecounts_div = document.querySelector('#filecounts');
      let html = `Uploading ${data.n+1} of ${data.of+1} ${data.ext}s`;
      uploadstatus_div.innerHTML = html;
      let summary = file_counts_summary_text(data.filecounts);
      filecounts_div.innerText = summary;
    }
  }
</script>

<center>
  <div id="upload-container">
    <Button width=280 height=36 fontsize='16px' nofeedback on:click={upload_all}>
      Upload All Files To Tator.io
    </Button>
    <div id="uploadstatus">&nbsp;</div>
    <div id="filecounts">&nbsp;</div>
  </div>
</center>

<iframe id="mediamanager" title="Media Manager Files">
</iframe>


<style>
  #upload-container {
    height: 140px;
    color: white;
    font-size: 20px;
    line-height: 22px;
  }

  #uploadstatus {
    margin-top: 10px;
  }

  #filecounts {
    color: lightgray;
    margin-top: 5px;
  }

/*
  button {
    color: white;
    font-weight: normal;
    text-decoration: none;
    word-break: break-word;
    font-size: 14px;
    line-height: 18px;
    border-top: 8px solid;
    border-bottom: 8px solid;
    border-right: 12px solid;
    border-left: 12px solid;
    background-color: #2ab27b;
    border-color: #2ab27b;
    display: inline-block;
    letter-spacing: 1px;
    min-width: 80px;
    text-align: center;
    border-radius: 4px;
    text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  }
*/
 
  #mediamanager {
    width: 100%;
    height: calc(100vh - (120px + 151px));
  }
</style>
