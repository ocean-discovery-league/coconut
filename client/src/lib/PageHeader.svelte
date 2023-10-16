<script>
  export let title;
  export let twolines = false;

  let font_size = '48px';
  let top = '-14px';
  if (twolines) {
      font_size = '32px';
      top = '-8px';
  }
      
</script>


<div id="container" style="--font-size:{font_size}; --top:{top};">
  <img src="/odl-logo-horiz-color-dkbg.png" alt="ODL Logo"/>
  <div id="title">
    {@html title}
  </div>
</div>


<style>
  #container {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    margin-top: 15px;
    text-align: left;
  }

  img {
    top: 18px;
    left: 25px;
    height: 65px;
    width: 176px;
  }

  #title {
    display: inline-block;
    position: relative;
    top: var(--top);
    left: 100px;
    /* max-width: 650px; */
    /* margin: 0 auto; */
    font-size: var(--font-size);
    line-height: 0.8em;
    font-weight: 700;
    text-align: left;
  }
</style>
