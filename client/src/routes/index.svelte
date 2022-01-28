<script>
  import Page from '$lib/Page.svelte';
  import MediaManager from '$lib/pages/MediaManager.svelte';
  import MissionID from '$lib/pages/MissionID.svelte';
  import WiFiSetup from '$lib/pages/WiFiSetup.svelte';
  import VideoSetup from '$lib/pages/VideoSetup.svelte';
  import PhotoSetup from '$lib/pages/PhotoSetup.svelte';
  import MissionISetup from '$lib/pages/MissionISetup.svelte';
  import MissionIISetup from '$lib/pages/MissionIISetup.svelte';
  import { onMount, onDestroy } from 'svelte';

  // let scrollX;
  // let scrollY;
  let isScrollingInterval;

  // $: {
  //   scrollX = scrollX;
  //   scrollY = scrollY;
  //   console.log('scrolly', scrollX, scrollY);
  //   if (sectionholder) {
  //     sectionholder.scrollTop = 0;
  //   }
  //   //scrollY = 0;
  // }
  
  onMount(() => {
    isScrollingInterval = setInterval(isScrolling, 100);
  });

  onDestroy( () => {
    if (isScrollingInterval) {
      clearInterval(isScrollingInterval);
      isScrollingInterval = false;
    }
  });

  let sectionholder;
  let scrollLeft;
  function isScrolling() {
    if (!sectionholder) {
      sectionholder = document.querySelector('#sectionholder');
      scrollLeft = sectionholder.scrollLeft;
    }

    if (sectionholder.scrollLeft != scrollLeft) {
      //console.log('moved! (index.svelte)');
      scrollLeft = sectionholder.scrollLeft;
      //sectionholder.scrollTop = 0;
    }
  }

</script>

<svelte:head>
  <title>Maka Niu</title>
</svelte:head>

<!-- <svelte:window bind:scrollX={scrollX} bind:scrollY={scrollY}/> -->

<div id="sectionholder">

  <Page id="media_manager">
    <MediaManager/>
  </Page>


  <Page id="username_section">
    <MissionID/>
  </Page>


  <Page id="wifi_section">
    <WiFiSetup/>
  </Page>


  <Page id="video_setup_section">
    <VideoSetup/>
  </Page>


  <Page id="photo_setup_section">
    <PhotoSetup/>
  </Page>


  <Page id="mission-1-setup">
    <MissionISetup/>
  </Page>


  <Page id="mission-2-setup">
    <MissionIISetup/>
  </Page>

</div>
