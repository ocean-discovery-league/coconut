 <script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import Page from '$lib/Page.svelte';
  import MediaManager from '$lib/../pages/MediaManager.svelte';
  import MissionID from '$lib/../pages/MissionID.svelte';
  import NetworkSetup from '$lib/../pages/NetworkSetup.svelte';
  import VideoSetup from '$lib/../pages/VideoSetup.svelte';
  import PhotoSetup from '$lib/../pages/PhotoSetup.svelte';
  import MissionISetup from '$lib/../pages/MissionISetup.svelte';
  import MissionIISetup from '$lib/../pages/MissionIISetup.svelte';

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
      //isScrollingInterval = setInterval(isScrolling, 100);

      if (window.location.hash.substr(1)) {
          parseHash();
          if (hashParams.page) {
              let n = Number(hashParams.page);
              let sections = document.querySelectorAll('section');
              if (sections[n-1]) {
                  sections[n-1].scrollIntoView(true);
                  //sections[n-1].focus();
              }
          }
      } else {
          window.location.hash = "page=2";
          let n = 2;
          let sections = document.querySelectorAll('section');
          if (sections[n-1]) {
              sections[n-1].scrollIntoView(true);
              //sections[n-1].focus();
          }
      }

      document.onkeydown = handle_key_press;
      console.log(document.onkeypress);
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

  let hashParams = {};
  function parseHash() {
      let hash = window.location.hash.substr(1);
      hashParams = hash.split('&').reduce(function (result, item) {
          let parts = item.split('=');
          if (typeof parts[1] === 'undefined') {
              parts[1] = true;
          }
          result[parts[0]] = parts[1];
          return result;
      }, {});
  }

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
  <title>Maka Niu</title>
</svelte:head>

<!-- <svelte:window bind:scrollX={scrollX} bind:scrollY={scrollY}/> -->

<div id="sectionholder">

  <Page title="Media Manager">
    <MediaManager/>
  </Page>


  <Page title="Mission ID">
    <MissionID/>
  </Page>


  <Page title="Network Setup" id="network-setup">
    <NetworkSetup/>
  </Page>


  <Page title="Video Setup">
    <VideoSetup/>
  </Page>


  <Page title="Photo Setup">
    <PhotoSetup/>
  </Page>


  <Page title="Mission &nbsp;I">
    <MissionISetup/>
  </Page>


  <Page title="Mission &nbsp;II">
    <MissionIISetup/>
  </Page>

</div>


<style>
  #sectionholder {
    font-family: sans-serif;
    scroll-snap-type: x mandatory;      
    overscroll-behaviour: contain;
    /*scroll-behavior: smooth;*/
    display: flex;
    -webkit-overflow-scrolling: touch;
    overflow-x: scroll;
    height: 100vh;
  }
  #sectionholder::-webkit-scrollbar {
    display: none;
    height: 0 !important;
    width: 0 !important;
  }
</style>
