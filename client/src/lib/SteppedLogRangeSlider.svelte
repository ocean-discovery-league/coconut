<!-- note: not really a fully realized "SteppedLogRangeSlider" yet, -->
<!-- just a slight wrapped on a plain RangeSlider -->

<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import RangeSlider from 'svelte-range-slider-pips';

  export let value;
  export let step;
  export let min;
  export let max;

  let values = [0];
  $: values[0] = value;

  const dispatch = createEventDispatcher();

  function changeHandler(event) {
    dispatch('change', event.detail);
  }
</script>

<RangeSlider
  bind:values={values}
  on:change={changeHandler}
  step={step} {min} {max}
  pips first='label' last='label' rest={false}
/>
