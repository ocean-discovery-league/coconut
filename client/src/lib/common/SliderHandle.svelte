<!-- Adapted from: https://github.com/BulatDashiev/svelte-slider/blob/master/src/Thumb.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import handle from '$lib/common/sliderHandler.js';
	const dispatch = createEventDispatcher();
	let pos, active, label;
	export { pos, label };
</script>

<div
	class="handle"
	style={`left: ${pos * 100}%;`}
	use:handle
	on:dragstart={() => ((active = true), dispatch('active', true))}
	on:drag={({ detail: v }) => (pos = v)}
	on:dragend={() => ((active = false), dispatch('active', false))}
>
	<div class="handle-slot" class:active>
		<slot />
	</div>
	<p class="handle-label">{label}</p>
</div>

<style>
	.handle {
		position: absolute;
		top: 50%;
		width: 0;
		height: 0;
	}
	.handle-slot {
		position: relative;
		width: fit-content;
		height: fit-content;
		transform: translate(-50%, -50%);
	}
	.handle-label {
		position: relative;
		width: fit-content;
		height: fit-content;
		transform: translate(-50%, -100%);
	}
	.handle-slot::before {
		content: '';
		position: absolute;
		width: 200%;
		height: 200%;
		transform: translate(-25%, -25%) scale(0);
		border-radius: 100vh;
		background: var(--slider-handle-bg, #000);
		opacity: 10%;
		transition: transform 100ms ease-in-out;
	}
	.handle-slot.active::before {
		transform: translate(-25%, -25%) scale(1.5, 1);
	}
</style>
