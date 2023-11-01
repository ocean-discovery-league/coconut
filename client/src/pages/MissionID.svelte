<script>
  import PageBody from '$lib/PageBody.svelte';
  import Button from '$lib/Button.svelte';
  import { fetch200 } from '$lib/misc.js';
  import { missionid_data } from '$lib/stores.js';

  let username;
  let missionid;
  let save_button;


  missionid_data.subscribe( (data) => {
      username  = ($missionid_data && $missionid_data.username)  || '';
      missionid = ($missionid_data && $missionid_data.missionid) || '';
  });

  async function save_missionid(event) {
      event.preventDefault();
      
      try {
	  console.log(username);
	  console.log(missionid);

          let request = new Request('/api/v1/missionid');
	  let data = { username, missionid };
          let json = JSON.stringify(data);
	  let response = await fetch200(request, {
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


<PageBody slot="PageBody">
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
  form {
    font-size: 20px;
    line-height: 26px;
  }

  table {
    display: grid;
    place-items: center;
    background-color: rgba(0,0,0,0);
  }

  label {
    color: var(--odl-gray-4);
    font-size: 20px;
    font-weight: var(--odl-font-normal);
  }

  input {
    font-size: 24px;
    font-family: sans-serif;
    margin-top: 5px;
  }
</style>
