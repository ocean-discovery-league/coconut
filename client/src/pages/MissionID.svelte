<script>
  import { onMount, onDestroy } from 'svelte';
  import PageBody from '$lib/PageBody.svelte';

  onMount(() => {
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
      hostname_banner.innerText = json.hostname || '';
      macaddress_banner.innerText = json.macaddress || '';
      version_field.innerText = 'v' + (json.version || '');
      username_field.value  = json.username  || '';
      missionid_field.value = json.missionid || '';
    }
      
    async function save_missionid(event) {
        event.preventDefault();
        
        let savemissionid_button = document.querySelector('#savemissionid');
        let savemissionidstatus_div = document.querySelector('#savemissionidstatus');
        savemissionid_button.focus();

        try {
	    let formdata = new FormData(event.target);
	    let username  = formdata.get('username');
	    let missionid = formdata.get('missionid');
	    console.log(formdata);
	    console.log(username);
	    console.log(missionid);

	    let json = { username, missionid };
	    savemissionidstatus_div.innerHTML = ' &nbsp; &nbsp;• • •';
	    let response = await fetch(missionid_request, {
	        method: 'POST',
	        body: JSON.stringify(json),
	        headers: {
		    'Content-Type': 'application/json'
	        }
	    });

	    if (response.ok) {
	        savemissionidstatus_div.innerText = 'Saved!';
	    } else {
	        savemissionidstatus_div.innerText = `Error: ${response.statusText}`;
	    }
        } catch(err) {
	    savemissionidstatus_div.innerText = `Error: ${err}`;
        }
    }
  });
</script>


<PageBody slot="PageBody">
  <span id="hostname">&nbsp;</span><br><span id="macaddress">&nbsp;</span>
  <br>
  <span id="version">X</span>
  <br>

  <form width="70%" id="missionid_form" enctype="multipart/form-data" method="post">
    <table width="400">
      <tr><td>
	  <br>
	  <br>
	  <div>
	    <label for="username">User Name</label>
	    <br>
	    <input id="username" autocorrect="off" autocapitalize="none" type="text" name="username" size="18" required/>
	  </div>
      </td></tr><tr><td height="25">
      </td></tr><tr><td>
	  <div>
	    <label for="missionid">Mission ID</label>
	    <br>
	    <input id="missionid" autocorrect="off" autocapitalize="none" autocomplete="off" type="text" name="missionid" size="18" required/>
	  </div>
      </td></tr><tr><td height="25">
      </td></tr><tr><td>
	  <center>
	    <button id="savemissionid">
	      Save
	    </button>
	    <div id="savemissionidstatus"></div>
	  </center>
      </td></tr>
    </table>
  </form>
</PageBody>


<style>
  #macaddress, #version {
    color: darkgrey;
  }

  #savemissionidstatus {
    position: relative;
    color: darkgrey;
    font-size: 20px;
    line-height: 22px;
    text-align: left;
    margin-top: 30px;
  }

  form {
    font-size: 20px;
    line-height: 26px;
    margin: 0 0 16px;
  }

  table {
    display: grid;
    margin-top: 30px;
    place-items: center;
    background-color: #13343D;
  }

  label {
    font-size:20px;
    font-weight:900;
  }

  input {
    font-size: 24px;
    margin-top: 5px;
  }
  
  button {
    color: white;
    font-weight: normal;
    text-decoration: none;
    word-break: break-word;
    font-size: 20px;
    line-height: 26px;
    border-top: 14px solid;
    border-bottom: 14px solid;
    border-right: 32px solid;
    border-left: 32px solid;
    background-color: #2ab27b;
    border-color: #2ab27b;
    display: inline-block;
    letter-spacing: 1px;
    min-width: 80px;
    text-align: center;
    border-radius: 4px;
    text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  }
</style>
