<script>
  import { onMount, onDestroy } from 'svelte';
  import PageBody from '$lib/PageBody.svelte';
  import Button from '$lib/Button.svelte';

  let save_button;
  let mounted = false;

  let title = 'Maka Niu';
  $: if (mounted) document.title = title;

  onMount(() => {
    mounted = true;
    const missionid_request = new Request('/missionid');

    let missionid_form = document.getElementById('missionid_form');
    missionid_form.addEventListener('submit', save_missionid);
    fillInMissionID();

    async function fillInMissionID() {
      let response = await fetch(missionid_request);
      console.log(response);
      let json = await response.json();
      console.log(json);
      let hostname_banner = document.querySelector('#hostname');
      let macaddress_banner = document.querySelector('#macaddress');
      let username_field = document.querySelector('#username');
      let missionid_field = document.querySelector('#missionid');
      let version_field = document.querySelector('#version');
      hostname_banner.innerText = json.hostname || '• • •';
      macaddress_banner.innerText = json.macaddress || '• • •';
      version_field.innerText = 'v' + (json.version || '• • •');

      username_field.value  = json.username  || '';
      missionid_field.value = json.missionid || '';

      title = 'Maka Niu';
      if (json.hostname) {
	title = title + ' ' + json.hostname;
      }
    }
      
    async function save_missionid(event) {
        event.preventDefault();
        
        try {
	    let formdata = new FormData(event.target);
	    let username  = formdata.get('username');
	    let missionid = formdata.get('missionid');
	    console.log(formdata);
	    console.log(username);
	    console.log(missionid);

	    let json = { username, missionid };
	    let response = await fetch(missionid_request, {
	        method: 'POST',
	        body: JSON.stringify(json),
	        headers: {
		    'Content-Type': 'application/json'
	        }
	    });

	    if (response.ok) {
	      save_button.feedback(false, 'Saved!');
	    } else {
	      save_button.feedback(response.statusText);
	    }
        } catch(err) {
	  save_button.feedback(err);
        }
    }
  });
</script>


<PageBody slot="PageBody">
  <span id="hostname">&nbsp;</span><br><span id="macaddress">&nbsp;</span>
  <div id="version">• • •</div>

  <form width="70%" id="missionid_form" enctype="multipart/form-data" method="post" autocomplete="off">
    <table width="400">
      <tr><td>
	  <div>
	    <label for="username">User Name</label>
	    <br>
	    <input id="username" name="username" autocorrect="off" autocapitalize="none" type="text" size="18" autocomplete="off"/>
	  </div>
      </td></tr><tr><td height="25">
      </td></tr><tr><td>
	  <div>
	    <label for="missionid">Mission ID</label>
	    <br>
	    <input id="missionid" name="missionid" autocorrect="off" autocapitalize="none" autocomplete="off" type="text" size="18"/>
	  </div>
      </td></tr><tr><td height="40">
      </td></tr><tr><td>
	  <center>
	    <Button bind:this={save_button}>Save</Button>
	  </center>
      </td></tr>
    </table>
  </form>
</PageBody>


<style>
  #macaddress, #version {
    color: darkgrey;
  }

  form {
    font-size: 20px;
    line-height: 26px;
    margin: 0 0 16px;
  }

  table {
    display: grid;
    margin-top: 48px;
    place-items: center;
    background-color: rgba(0,0,0,0);
  }

  label {
    font-size:20px;
    font-weight:900;
  }

  input {
    font-size: 24px;
    margin-top: 5px;
  }
</style>
