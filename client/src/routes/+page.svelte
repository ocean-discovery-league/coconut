<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { getDeviceType, parseHashParams } from '$lib/misc.js';
  import Page from '$lib/Page.svelte';
  import EndPage from '$lib/EndPage.svelte';
  import MediaManager from '$pages/MediaManager.svelte';
  //import MissionID from '$lib/../pages/MissionID.svelte';
  import NetworkSetup from '$lib/../pages/NetworkSetup.svelte';
  import WiFiSetup from '$lib/../pages/WiFiSetup.svelte';
  import BluetoothSetup from '$lib/../pages/BluetoothSetup.svelte';
  import VideoSetup from '$lib/../pages/VideoSetup.svelte';
  import PhotoSetup from '$lib/../pages/PhotoSetup.svelte';
  import MissionISetup from '$lib/../pages/MissionISetup.svelte';
  import MissionIISetup from '$lib/../pages/MissionIISetup.svelte';
  import { fetch200 } from '$lib/misc.js';
  import { missionid_data } from '$lib/stores.js';

  let title_prefix = 'Maka Niu';
  let title = title_prefix;
  let devicetype = 'MKN';
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
  
  onMount(async () => {
      devicetype = await getDeviceType();
      console.log('devicetype', devicetype);
      //isScrollingInterval = setInterval(isScrolling, 100);

      let hashParams = parseHashParams('#page=2');
      if (hashParams.has('page')) {
          let n = Number(hashParams.get('page'));
          let sections = document.querySelectorAll('section');
          if (sections[n-1]) {
              sections[n-1].scrollIntoView(true);
              //sections[n-1].focus();
          }
      }

      document.onkeydown = handle_key_press;
      console.log(document.onkeypress);

      let request = new Request('/api/v1/missionid');
      let response = await fetch200(request);
      let data = await response.json();
      $missionid_data = data;
      if (missionid_data.hostname) {
	  title = title_prefix + ' ' + missionid_data.hostname;
      }
  });

  onDestroy(() => { 
      if (isScrollingInterval) {
          clearInterval(isScrollingInterval);
          isScrollingInterval = false;
      }
      if (browser) {
          document.onkeydown = undefined;
      }
  });

  function handle_key_press(event) {
      let keycode = typeof event !== 'undefined' ? event.keyCode : event.which;
      if (event.target && event.target.type === "text") {
          return;
      }
      if (keycode === 37) {
          scroll_right();
      }
      if (keycode === 39) {
          scroll_left();
      }
  }

  function scroll_right() {
      console.log('right');
      if (!sectionholder) {
          sectionholder = document.querySelector('#sectionholder');
      }
      //sectionholder.scrollLeft -= window.innerWidth;
      sectionholder.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
      // note: when you wanna make it scroll smoothly in safari too see
      // https://stackoverflow.com/questions/56011205/is-there-a-safari-equivalent-for-scroll-behavior-smooth
  }

  function scroll_left() {
      console.log('left');
      if (!sectionholder) {
          sectionholder = document.querySelector('#sectionholder');
      }
      //sectionholder.scrollLeft += window.innerWidth;
      sectionholder.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
  }

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
  <title>{title}</title>
</svelte:head>

<!-- <svelte:window bind:scrollX={scrollX} bind:scrollY={scrollY}/> -->

    
<div id="sectionholder">
  <EndPage/>
  {#if devicetype === 'LIT'}
    <!--
    <Page title="Network Setup">
      <NetworkSetup {devicetype}/>
    </Page>
    -->
    <Page title="Network<br>Setup" twolines>
      <WiFiSetup {devicetype}/>
    </Page>
  {:else}
    <Page title="Media<br>Manager" twolines>
      <MediaManager/>
    </Page>


    <!--
    <Page title="Mission ID">
      <MissionID/>
    </Page>
    -->


    <Page title="Network<br>Setup" twolines>
      <NetworkSetup {devicetype}/>
    </Page>
    <!--
    <Page title="Bluetooth<br>Setup" twolines>
      <BluetoothSetup {devicetype}/>
    </Page>
    -->


    <!--
    <Page title="Video Setup">
      <VideoSetup/>
    </Page>
    -->

    <!--
    <Page title="Photo Setup">
      <PhotoSetup/>
    </Page>
    -->


    <Page title="Mission &nbsp;I">
      <MissionISetup/>
    </Page>


    <Page title="Mission &nbsp;II">
      <MissionIISetup/>
    </Page>
  {/if}
  <EndPage/>
</div>


<style>
  #sectionholder {
    scroll-snap-type: x mandatory;      
    overscroll-behaviour: contain;
    /*scroll-behavior: smooth;*/
    display: flex;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: none;
    overflow-x: scroll;
    height: 100vh;
  }
  #sectionholder::-webkit-scrollbar {
    display: none;
    height: 0 !important;
    width: 0 !important;
  }
</style>
