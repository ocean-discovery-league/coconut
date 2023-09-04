<script>
  export let fraction;
  export let width = 200;

  let filler_width = 0;
  $: {
      fraction = Math.max(0.0, fraction);
      fraction = Math.min(1.0, fraction);
      filler_width = Math.floor(width * fraction);
  }
</script>


<div id="progressbar" style="width:{width}px">
  <div id="progressbarfiller" style="width:{filler_width}px"></div>
</div>


<style>
  #progressbar {
    display: inline-block;
    position: relative;
    top: 1px;
    width: 200px;
    height: 14px;
    text-align: left;
    border: 2px solid white;
    border-radius: 2px;
    overflow: hidden;
  }
  #progressbarfiller {
    display: inline-block;
    position: relative;
    top: -10px;
    left: 0;
    width: 0%;
    height: 20px;
    background-color: white;
  }
</style>
