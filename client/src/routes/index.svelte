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

  
  onMount(() => {
  });
</script>

<svelte:head>
  <title>Maka Niu</title>
</svelte:head>

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
