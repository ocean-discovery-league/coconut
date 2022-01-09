<script>
	import Slider from '$lib/common/Slider.svelte';
	let slider_horizontal_margins = [8, 16];
	let row_spacing = 5;
	let settings;
	export { slider_horizontal_margins, row_spacing, settings };

	function styleTitle(title) {
		const parts = title.split(/(?=[A-Z])/);
		const capitalizeFirst = (string) => string.charAt(0).toUpperCase() + string.slice(1);

		if (!parts) {
			return capitalizeFirst(title);
		}

		parts.forEach((element, index) => {
			parts[index] = capitalizeFirst(element);
		});
		return parts.join(' ');
	}
</script>

<div style="width: 100%; --row-spacing: {row_spacing}px">
	{#each Object.keys(settings) as key, index}
		<div class="title">
			{styleTitle(key)}
		</div>
		<div class="spacer" />
		<div class="slider">
			{#if Object.values(settings[key]).length == 2}
				<Slider
					bind:value={settings[key].value}
					isRangeSlider={false}
					bounds={settings[key].bounds}
					step={1}
					horizontal_margins={slider_horizontal_margins}
				/>
			{:else if Object.values(settings[key]).length == 3}
				<Slider
					bind:minValue={settings[key].min}
					bind:maxValue={settings[key].max}
					isRangeSlider={true}
					bounds={settings[key].bounds}
					step={1}
					horizontal_margins={slider_horizontal_margins}
				/>
			{/if}
		</div>
		{#if index < Object.keys(settings).length - 1}
			<div class="spacer" />
		{/if}
	{/each}
</div>

<style>
	div {
		width: 100%;
	}
	.spacer {
		height: var(--row-spacing);
	}

	.title {
		font-weight: 500;
		font-size: 19px;
	}
</style>
