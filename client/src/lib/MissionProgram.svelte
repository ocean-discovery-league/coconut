<script>
  import { onMount, onDestroy } from 'svelte';
  import MissionDiagram from '$lib/MissionDiagram.svelte';
  //import Slider from '$lib/common/Slider.svelte';
  //import SliderGroup from '$lib/common/SliderGroup.svelte';
  import RangeSlider from 'svelte-range-slider-pips';
  import { getSocketIO } from '$lib/utils';

  export let programid;
  export let height = '790px';

  let editing;
  let edit_step;
  let edit_scale;
  let edit_value;
  let edit_values = [];
  let param_value;
  let units_label = 'Secs';
  let diagram_div_id = programid + '-diagram';
  let missiondiagram;

  let socket;
  let mission;
  let currentSelection;
  let min;
  let max;

  onMount( () => {
    socket = getSocketIO();
  });

  $: param_value = Math.round(edit_value*edit_scale);
  $: edit_values[0] = edit_value;

  $: if (currentSelection && editing) {
    let node = currentSelection.data;
    let diagram = currentSelection.diagram;
    if (node && node.param && diagram) {
      // if (node.type === 'interval') {
      // 	edit_value = Number(edit_value);
      // 	if (Number.isNaN(edit_value)) {
      // 	  edit_value = node.default;
      // 	}
      // }
      diagram.model.set(node, 'value', param_value);
      //console.log('updateparam', { programid, name: currentSelection.data.param, value: param_value });
      socket.emit('updateparam', { programid, name: currentSelection.data.param, value: param_value });
    }
  }

  function selectionChangedHandler(event) {
    let part = event.detail;
    let node = part.data;
    let shape = part.elt(0);
    if (part && part.isSelected) {
      currentSelection = part;
      if (node && node.param) {
	if (node.scale === 'deciseconds') {
	  edit_scale = 10;
	  edit_step = 0.1;
	} else if (node.scale === 'm') {
	  edit_scale = 1;
	  edit_step = 0.1;
	} else {
	  edit_scale = 1;
	  edit_step = 1;
	}
	let fixed;
	if (node.scale === 0.1) {
	  fixed = 1;
	} else {
	  fixed = 0;
	}
	edit_value = (node.value/edit_scale).toFixed(fixed);
	min = Number((node.range.low/edit_scale).toFixed(fixed));
	max = Number((node.range.high/edit_scale).toFixed(fixed));
	units_label = node.units_label;
	editing = true;
      } else {
	editing = false;
      }
    } else {
      currentSelection = undefined;
      editing = false;
    }
  }
</script>


<div style="position:relative">
  <MissionDiagram {programid} {height} on:selectionchanged={selectionChangedHandler} bind:this={missiondiagram}/>

  <div style="position:fixed;left:0px;bottom:{editing ? '0px':'-200px'};height:200px;z-index:900;width:100%;background-color:rgba(0,0,0,0.75);transition:all 0.2s">
    <br>
    <div class="sliderContainer">
      {#if editing}
	<input type='text' size='6' bind:value={edit_value} on:change={(e) => {console.log(e);edit_values[0] = edit_value}}/>
	<span class='units'>{units_label}</span>
	<RangeSlider bind:values={edit_values} on:change={(e) => {console.log(e); edit_value = e.detail.value}} step={edit_step} {min} {max}
	  pips first='label' last='label' rest={false}/>
	<!-- <Slider bind:value={edit_value} bind:minValue={min} bind:maxValue={max} step={0.1} on:change={slider.value=edit_value}/> -->
	<!-- <SliderGroup bind:settings class=".sliders" /> -->
      {/if}
      <div class="close" on:click={() => {editing = false; currentSelection.diagram.clearSelection()}}>
	<svg fill="none" viewBox="0 0 24 24" height="48" width="48" xmlns="http://www.w3.org/2000/svg">
	  <path xmlns="http://www.w3.org/2000/svg" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM7.79289 7.79289C8.18342 7.40237 8.81658 7.40237 9.20711 7.79289L12 10.5858L14.7929 7.79289C15.1834 7.40237 15.8166 7.40237 16.2071 7.79289C16.5976 8.18342 16.5976 8.81658 16.2071 9.20711L13.4142 12L16.2071 14.7929C16.5976 15.1834 16.5976 15.8166 16.2071 16.2071C15.8166 16.5976 15.1834 16.5976 14.7929 16.2071L12 13.4142L9.20711 16.2071C8.81658 16.5976 8.18342 16.5976 7.79289 16.2071C7.40237 15.8166 7.40237 15.1834 7.79289 14.7929L10.5858 12L7.79289 9.20711C7.40237 8.81658 7.40237 8.18342 7.79289 7.79289Z" fill="#7BA5AF"></path>
	</svg>
      </div>
    </div>
    <!--
    <button value="delete" on:click={mission.deleteNode()}>🚮</button>
    <button value="add_before" on:click={mission.addNode(false)}>↪️</button>
    <button value="add_after" on:click={mission.addNode(true)}>↩️</button>
    -->
  </div>
</div>


<style>
  .sliderContainer {
    position: relative;
    width: 400px;
    margin-left: 20px;
    margin-top: 10px;
    font-size: 30px;
  }

  .close {
    position: absolute;
    top: -20px;
    right: -15px;
  }

  .units {
    position: relative;
    top: -6px;
    color: #7BA5AF;
  }

  input {
    position: relative;
    top: -5px;
    font-size: 30px;
    /* text-align: right; */
    /* text-align: center; */
    background-color: #7BA5AF;
  }
</style>
