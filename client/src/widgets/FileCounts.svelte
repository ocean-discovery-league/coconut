<script>
  export let store;
  import { onMount, onDestroy } from 'svelte';

  function file_counts_summary_text(fileCounts) {
      let text = '';
      console.log( {fileCounts} );
      if (fileCounts) {
          let logs   = fileCounts.logs   || 0;
          let images = fileCounts.images || 0;
          let videos = fileCounts.videos || 0;

          text = `${logs} log${logs===1?'':'s'},
                  ${images} photo${images===1?'':'s'},
                  ${videos} video${videos===1?'':'s'}`;

          let others = fileCounts.other || 0;
          if (fileCounts.other) {
              text += `, ${others} other${others===1?'':'s'}`;
          }
      }
      return text;
  }
</script>


<div class="filecounts">
  {#if $store}
    {file_counts_summary_text($store)}
  {:else}
    • • •
  {/if}
</div>


<style>
  .filecounts {
    color: gray;
    margin-top: 5px;
    min-height: calc(1em + 2px);
  }
</style>
