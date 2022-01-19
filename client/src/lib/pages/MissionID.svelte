<script>
  import { onMount, onDestroy } from 'svelte';

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
      hostname_banner.innerText = json.hostname || '';
      macaddress_banner.innerText = json.macaddress || '';
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

<h2 style="font-size:64px"><img height="80px" width="80px" src="/favicon.png" style="position:relative;top:18px;right:10px" alt="ODL Logo"/>
  <span style="font-size:58px">Mission ID</span>
</h2>

<br>
<br>

<center>
  <div style="font-size:22px;font-weight:700;color:white;margin-bottom:20px"><span id="hostname">&nbsp;</span><br><span id="macaddress" style="color:darkgrey">&nbsp;</span></div>
  <br>

  <form width="70%" id="missionid_form" enctype="multipart/form-data" method="post" style="font-size: 20px; line-height: 26px; margin: 0 0 16px">
    <table width="400" style="display:grid;place-items:center;background-color:#1B3C45">
      <tr><td>
	  <br>
	  <br>
	  <div style="font-size:20px;font-weight:900">
	    <label for="username">User Name</label><br>
	    <input id="username" autocorrect="off" autocapitalize="none" type="text" name="username" size="18" style="font-size:24px;margin-top:5px;" required/>
	  </div>
      </td></tr><tr><td style="height:25px">
      </td></tr><tr><td style="font-size:20px;font-weight:900">
	  <div style="font-size:20px;font-weight:900">
	    <label for="missionid">Mission ID<div style="font-size:11px;margin-left:2px"></div></label>
	    <input id="missionid" autocorrect="off" autocapitalize="none" autocomplete="off" type="text" name="missionid" size="18" style="font-size:24px;margin-top:5px" required/>
	  </div>
      </td></tr><tr><td style="height:25px">
      </td></tr><tr><td style="text-align:center">
	  <span style="display: inline-block; border-radius: 4px; background: #1f8b5f; border-bottom: 2px solid #1f8b5f;">
	    <button id="savemissionid" style="color: white; font-weight: normal; text-decoration: none; word-break: break-word; font-size: 20px; line-height: 26px; border-top: 14px solid; border-bottom: 14px solid; border-right: 32px solid; border-left: 32px solid; background-color: #2ab27b; border-color: #2ab27b; display: inline-block; letter-spacing: 1px; min-width: 80px; text-align: center; border-radius: 4px; text-shadow: 0 1px 1px rgba(0,0,0,0.25);">
	      Save
	    </button>
	  </span>
	  <br>
	  <br>
	  <br>
	  <br>
      </td></tr>
    </table>
    <div id="savemissionidstatus" style="position:relative;top:-50px;left:315px;color:white;font-size:20px;line-height:22px;text-align:left;margin-left:50px;margin-bottom:5px"></div>
  </form>
</center>
<br>
