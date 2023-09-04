<script>
  // https://stackoverflow.com/a/21206274/18291287
  export let fraction;
  export let width = 30;
  export let stroke_width = 2;

  let degrees=0;
  let height = width;
  let radius = (width - (stroke_width * 2)) / 2;
  let cx = width / 2;
  let cy = width / 2;
  let x;
  let y;
  $: {
      fraction = Math.max(0.0, fraction);
      fraction = Math.min(1.0, fraction);
      degrees = 360 * fraction;
      // https://stackoverflow.com/a/29157553/18291287
      x = cx + (radius * Math.sin(degrees * Math.PI / 180));
      y = cy - (radius * Math.cos(degrees * Math.PI / 180));
  }
</script>


<svg {width} {height} viewBox="0 0 {width} {height}">
  <circle {cx} {cy} r={radius} style="stroke-width:{stroke_width}"></circle>
  {#if degrees <= 180}
    <path d="M{cx},{cy} L{cx},{0+stroke_width} A{radius},{radius} 1 0,1 {x},{y} z"></path>
  {:else}
    <path d="M{cx},{cy} L{cx},{0+stroke_width} A{radius},{radius} 1 0,1 {cx},{radius*2+stroke_width} z"></path>
    <path d="M{cx},{cy} L{cx},{radius*2+stroke_width} A{radius},{radius} 1 0,1 {x},{y} z"></path>
  {/if}
</svg>


<style>
  svg {
    position: relative;
    top: 5px;
  }
  circle {
    fill: transparent;
    stroke: white;
  }

  path {
    fill: white;
  }
</style>
