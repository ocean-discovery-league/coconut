<!-- Adapted from: https://github.com/BulatDashiev/svelte-slider/blob/master/src/Slider.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import SliderHandle from '$lib/common/SliderHandle.svelte';
	const dispatch = createEventDispatcher();

	// props
	let bounds = [0, 100];
	let values = [bounds[0], bounds[1]];
	let isRangeSlider = false;
	let step = 10;
	let value, minValue, maxValue;
	let horizontal_margins = [8, 8];
	export { bounds, isRangeSlider, step, value, minValue, maxValue, values, horizontal_margins };

	// internal
	const trackHeight = 30;
	const labelHeight = 40;
	const containerHeight = trackHeight + labelHeight;
	let labels = [];
	setLabels();
	let pos = isRangeSlider
		? [minValue / (bounds[1] - bounds[0]), maxValue / (bounds[1] - bounds[0])]
		: [value / bounds[1] - bounds[0], 1];
	let active = false;

	// reactive values
	$: if (active) setValue(pos);
	$: if (!active) setPos(values);

	$: progress = `
      left: ${isRangeSlider ? Math.min(pos[0], pos[1]) * 100 : 0}%;
      right: ${100 - Math.max(pos[0], isRangeSlider ? pos[1] : pos[0]) * 100}%;
  `;

	function setValue(pos) {
		const offset = bounds[0] % step;
		const width = bounds[1] - bounds[0];
		const round = (val) => Math.round((val - offset) / step) * step + offset;
		values = pos.map((p) => bounds[0] + p * width).map((v) => round(v));
		let sorted = [...values].sort((a, b) => a - b);
		value = !isRangeSlider ? values[0] : undefined;
		minValue = isRangeSlider ? sorted[0] : undefined;
		maxValue = isRangeSlider ? sorted[1] : undefined;
		setLabels();
	}

	function setPos(values) {
		pos = values
			.map((v) => Math.min(Math.max(v, bounds[0]), bounds[1]))
			.map((v) => (v - bounds[0]) / (bounds[1] - bounds[0]));
	}

	function setLabels() {
		const stepParts = step.toString().split('.');
		const stepResolution = stepParts.length > 1 ? stepParts[1].length : 0;
		labels = values.map((v) => v.toFixed(stepResolution));
	}

	setValue(pos);
</script>

<div
	class="container"
	style="--track-height: {trackHeight}px; --container-height: {containerHeight}px; --margin-left: {horizontal_margins[0]}px; --margin-right: {horizontal_margins[1]}px;"
>
	<div class="track">
		<div class="progress" style={progress} />
		<SliderHandle label={labels[0]} bind:pos={pos[0]} on:active={({ detail: v }) => (active = v)}>
			<slot name="left">
				<slot>
					<div class="handle-shape" />
				</slot>
			</slot>
		</SliderHandle>
		{#if isRangeSlider}
			<SliderHandle label={labels[1]} bind:pos={pos[1]} on:active={({ detail: v }) => (active = v)}>
				<slot name="right">
					<slot>
						<div class="handle-shape" />
					</slot>
				</slot>
			</SliderHandle>
		{/if}
	</div>
</div>

<style>
  :root{
    --container-height: 60px;
    --track-height: 130px;
    --margin-left: 30px;
    --margin-right: 30px;
    --track-bg: grey;
    --progress-bg: grey;
    --slider-handle-bg: darkgrey;
  }
	.container {
		height: var(--container-height);
	}
	.track {
		position: relative;
		top: calc(var(--track-height) / 2);
		margin-left: var(--margin-left);
		margin-right: var(--margin-right);
		height: 4px;
		width: calc(100% - var(--margin-left) - var(--margin-right));
		border-radius: 100vh;
		background: var(--track-bg, #ebebeb);
	}
	.progress {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		border-radius: 100vh;
		background: var(--progress-bg, #000);
	}
	.handle-shape {
		width: 40px;
		height: var(--track-height, #000);
		border-radius: 100vh;
		background: var(--slider-handle-bg, #000);
	}
</style>
