<script>
  import { onMount, onDestroy } from 'svelte';
  import PageBody from '$lib/PageBody.svelte';
  import Button from '$lib/Button.svelte';

  let title = 'Maka Niu';
  let username;
  let missionid;
  let hostname = '• • •';
  let macaddress = '• • •';
  let python_version = '• • •';
  let version = '• • •';
  let save_button;

  let missionid_request;


  onMount(async () => {
      missionid_request = new Request('/api/v1/missionid');
      let response = await fetch(missionid_request);
      let data = await response.json();

      username  = data.username  || '';
      missionid = data.missionid || '';

      hostname       = data.hostname || '• • •';
      macaddress     = data.macaddress || '• • •';
      python_version = data.python_version || '• • •';
      if (data.version) {
          version = 'v' + data.version;
      }

      if (data.hostname) {
	  title = title + ' ' + data.hostname;
      }
  });
  

  async function save_missionid(event) {
      event.preventDefault();
      
      try {
	  console.log(username);
	  console.log(missionid);

	  let data = { username, missionid };
          let json = JSON.stringify(data);
	  let response = await fetch(missionid_request, {
	      method: 'POST',
	      body: json,
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
</script>


<svelte:head>
  <title>{title}</title>
</svelte:head>

<PageBody slot="PageBody">
  <div>{hostname}</div>
  <div class="dark">{macaddress}</div>
  <div class="dark">{python_version}</div>
  <div class="dark">{version}</div>

  <form width="70%" on:submit={save_missionid} enctype="multipart/form-data" method="post" autocomplete="off">
    <table width="400">
      <tr><td>
	  <div>
	    <label for="username">User Name</label>
	    <br>
	    <input bind:value={username} name="username" autocorrect="off" autocapitalize="none" type="text" size="18" autocomplete="off"/>
	  </div>
      </td></tr><tr><td height="25">
      </td></tr><tr><td>
	  <div>
	    <label for="missionid">Mission ID</label>
	    <br>
	    <input bind:value={missionid} name="missionid" autocorrect="off" autocapitalize="none" autocomplete="off" type="text" size="18"/>
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
  .dark {
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
    font-size: 20px;
    font-weight: 900;
  }

  input {
    font-size: 24px;
    margin-top: 5px;
  }
</style>
