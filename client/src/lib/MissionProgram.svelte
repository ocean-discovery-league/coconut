<script>
  import { onMount, onDestroy } from 'svelte';
  import MissionDiagram from '$lib/MissionDiagram.svelte';
  import CloseButton from '$lib/CloseButton.svelte';
  import SteppedLogRangeSlider from '$lib/SteppedLogRangeSlider.svelte';
  import { getSocketIO } from '$lib/misc.js';

  export let programid;
  export let height = '790px';

  let editing;
  let sliderValue = 0;
  let units_label = '';
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

  onDestroy( () => {
  });

  $: if (currentSelection && editing) {
    let node = currentSelection.data;
    let diagram = currentSelection.diagram;
    let new_value = Math.round(editing.value * editing.scale);
    //sliders[0] = editing.value;
    let update = { programid, name: currentSelection.data.param, value: new_value };
    socket.emit('missionprograms/updateparam', update);
    if (node && node.param && diagram) {
      let label = node.label || '#';
      label = label.replace(/{s}/g, (editing.value === 1) ? '':'s');
      units_label = label;
      diagram.model.set(node, 'value', new_value);
    }
  }

  function unitsChangedHandler(event) {
    //console.log('unitsChangedHandler');
    let node = currentSelection.data;
    let units = editing.options[editing.edit_units];

    let fixed = (units.step < 1) ? 1 : 0;
    //editing.value = (node.value / units.scale).toFixed(fixed);  // not sure we want the jumping
    editing = { ...editing, ...units };
    min = Number((units.range.low).toFixed(fixed));
    max = Number((units.range.high).toFixed(fixed));

    // save the chosen editing units
    node.edit_units = editing.edit_units;
    let param_name = currentSelection.data.param + '_EDIT_UNITS';
    let update = { programid, name: param_name, value: node.edit_units };
    socket.emit('missionprograms/updateparam', update);
  }

  function inputChangedHandler(event) {
    sliderValue = editing.value;
  }

  function sliderChangedHandler(event) {
    editing.value = event.detail.value
  }

  function selectionChangedHandler(event) {
    //console.log('selectionChangedHandler');
    let part = event.detail;
    let node = part.data;
    let shape = part.elt(0);

    if (!part || !part.isSelected || !node || !node.param) {
      currentSelection = undefined;
      editing = false;
      return;
    }
      
    currentSelection = part;

    let editing_defaults = {
      step: 1,
      scale: 1,
    };

    let units = {};
    if (node.editing && node.editing.options) {
      let options = node.editing.options;
      let edit_units = node.edit_units;
      if (!edit_units || !(edit_units in options)) {
	edit_units = editing.options_order[0];
      }
      units = options[edit_units];
      units.edit_units = edit_units;  // so that it gets xfered onto editing via ...units below
    }

    if (node.editing) {
      editing = { ...editing_defaults, ...node.editing, ...units };
    } else {
      editing = { ...editing_defaults, ...node, ...units };
    }

    let fixed = (units.step < 1) ? 1 : 0;
    editing.value = (node.value / editing.scale).toFixed(fixed).replace(/\.0+$/,'');
    sliderValue = editing.value;
    min = Number((editing.range.low / editing.scale).toFixed(fixed));
    max = Number((editing.range.high / editing.scale).toFixed(fixed));

    units_label = node.label || '';
    units_label = units_label.replace(/{s}/g, (editing.value === 1) ? '':'s');
  }


  function formatNodeTextLabel(node) {
    let text = node.text || '#';
    try {
      if (node.editing && node.editing.options && !node.editing.options_order) {
	// compute the pulldown menu order based on rank
	let options = node.editing.options;
	node.editing.options_order = Object.keys(options);
	node.editing.options_order.sort( (one, two) => {
	  return options[one].rank > options[two].rank ? 1 : -1;
	});
      }

      let units = {};
      if (node.edit_units && node.editing.options) {
	units = node.editing.options[node.edit_units];
      }

      if (node && node.template) {
	let value = node.value;
	let scale = (units && units.scale) || node.scale || 1;
	//let fixed = (node.scale === 0.1) ? 1 : 0;
	let fixed = 1;
	value = (value / scale).toFixed(fixed).replace(/\.0+$/,'');
	text = node.template;
	text = text.replace(/{units}/g, node.edit_units || '');
	text = text.replace(/{abbr}/g, (units && units.abbr) || node.abbr || node.edit_units || '');
	text = text.replace(/{x}/g, value);
	text = text.replace(/{s}/g, (value === 1) ? '':'s');
      }
      //console.log({text});
    } catch(err) {
      console.error('error in formatNodeTextLabel', err);
    }
    return text;
  }

  function closeHandler() {
    editing = false;
    missiondiagram.clearSelection();
  }
</script>


<div style="position:relative">
  <MissionDiagram {programid} {height} on:selectionchanged={selectionChangedHandler} bind:this={missiondiagram} {formatNodeTextLabel}/>

  <div style="position:fixed;left:0px;bottom:{editing ? '0px':'-200px'};height:200px;z-index:900;width:100%;background-color:rgba(0,0,0,0.75);transition:all 0.2s">
    <br>
    <div class="sliderContainer">
      {#if editing}
	<input type='text' size='6' bind:value={editing.value} on:input={inputChangedHandler}/>
	{#if !editing.options}
	  <span class='units'>{units_label}</span>
	{:else}
	  <select class='units_select' id='edit_units' bind:value={editing.edit_units} on:change={unitsChangedHandler}>
	    {#each editing.options_order as key}
	      <option class='units' value={key}>{editing.options[key].label}</option>
	    {/each}
	  </select>
	{/if}
	<SteppedLogRangeSlider
	  value={sliderValue}
	  on:change={sliderChangedHandler}
	  step={editing.step}
	  {min} {max}
	/>
      {/if}
      <CloseButton on:click={closeHandler}/>
    </div>
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

  .units {
    position: relative;
    top: -6px;
    color: #7BA5AF;
  }

  .units_select {
    position: relative;
    width: 160px;
    padding: 0px 8px 0px 0px;
    top: -6px;
    outline: 2px solid #7BA5AF;
    font-size: 30px;
    color: #7BA5AF;
    background-color: black;
  }

  :global(.rangePips .pip) {
    width: 3px;
  }

  input {
    position: relative;
    top: -5px;
    font-size: 30px;
    font-family: sans-serif;
    /* text-align: right; */
    /* text-align: center; */
    background-color: #7BA5AF;
  }
</style>
