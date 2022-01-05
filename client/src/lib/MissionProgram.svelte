<script>
  import { onMount, onDestroy } from 'svelte';
  import Mission from '$lib/mission.js';

  export let programid;
  export let height = '790px';

  let diagram_div_id = programid + '-diagram';
  let label_div_id   = programid + '-label';
  let toolbox_div_id = programid + '-toolbox';

  let mission;

  onMount(() => {
      mission = new Mission();
      mission.init(programid);
  });
</script>


<div style="position:relative">
  <!-- <div id={diagram_div_id} style="width:75%;height:{height};pointer-events:none"></div> -->
  <div id={diagram_div_id} style="width:75%;height:{height}"></div>
  <div id={toolbox_div_id} style="position:fixed;left:0px;bottom:-150px;height:150px;z-index:900;width:100%;background-color:rgba(0,0,0,0.75);transition:all 0.2s">
    <button value="delete" on:click={mission.deleteNode()}>🚮</button>
    <button value="add_before" on:click={mission.addNode(false)}>↪️</button>
    <button value="add_after" on:click={mission.addNode(true)}>↩️</button>
    <input id={label_div_id} on:change={mission.onChangeHandler()}/>
  </div>
</div>
