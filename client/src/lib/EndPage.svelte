<script>
  import { onMount, onDestroy } from 'svelte';
  import { isOnScreen, setTimeoutAnimationFrame } from '$lib/misc.js';

  const MONITORONSCREEN_INTERVAL_MS = 100;
  let monitorOnScreenTimeout;
  let monitorOnScreenLastPosition;
  let endPage;
  
  onMount(() => {
      monitorOnScreen();
  });

  onDestroy(() => {
      clearTimeout(monitorOnScreenTimeout);
  });

  function monitorOnScreen() {
      if (!monitorOnScreenTimeout) {
          monitorOnScreenTimeout = setTimeoutAnimationFrame(monitorOnScreen, MONITORONSCREEN_INTERVAL_MS);
          return;
      }
      if (isOnScreen(endPage)) {
          let rect = endPage.getBoundingClientRect();
          console.log('end page on screen', rect.left, rect.right, endPage.parentElement.scrollLeft);

          if (rect.left === monitorOnScreenLastPosition) {
              let newScrollPoint;
              if (rect.left > 0) {  // right endpage
                  let showingAmount = window.innerWidth - 1 - rect.left;
                  console.log('right end showing amount', showingAmount);
                  newScrollPoint = endPage.parentElement.scrollLeft - showingAmount;
              } else {  // left endpage
                  let showingAmount = rect.right;
                  console.log('left end showing amount', showingAmount);
                  newScrollPoint = endPage.parentElement.scrollLeft + showingAmount;
              }
              console.log('nudging end page off screen', newScrollPoint);
              endPage.parentElement.scroll({ left: newScrollPoint, behavior: 'smooth' });
          }
          monitorOnScreenLastPosition = rect.left;
      }      
      monitorOnScreenTimeout = setTimeoutAnimationFrame(monitorOnScreen, MONITORONSCREEN_INTERVAL_MS);
  }
</script>


<section bind:this={endPage}>

  <div class="PageBody-container">
  </div>

</section>


<style>
  /* * { outline: solid 1px lightblue; } */

  section {
    width: 10vw;
    min-width: 10vw;
    max-width: 10vw;
    height: 100vh;
    min-height: 100vh;
    max-height: 100vh;
    /* border-right: 1px solid white; */
    /* padding: 1rem; */
    scroll-snap-align: start;
    /* scroll-snap-stop: always; */
    text-align: center;
    position: relative;
    overscroll-behavior: auto;
  }

  section {
    background-color: #111111;
  }

  .PageBody-container {
    position: relative;
    top: 120px;
    --height: calc(100vh - 105px);
    height: var(--height);
    max-height: var(--height);
    min-height: var(--height);
    width: 100%;
    max-width: 100%;
    min-width: 100%;
    margin-bottom:20px;
    /* overflow: auto; */
    /* overscroll-behavior: none; */
  }

  .PageBody {
    padding-top: 20px;
    width: 100%;
    --height: calc(100vh - 300px);
    /* height: --height; */
    /* max-height: --height; */
    font-size:22px;
    font-weight:700;
    color:white;
  }
</style>
