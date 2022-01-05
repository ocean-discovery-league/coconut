<script>
  import { onMount, onDestroy } from 'svelte';
  export let id;


  onMount(() => {
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


  function reset_scroll(id) {
    let div = document.getElementById(id);
    if (div) {
      div.scrollTop = 0;
      div.focus();
    }
  }
</script>

<section {id}>
  <slot/>
</section>

<style>
  /* * { outline: solid 1px lightblue; } */
</style>
