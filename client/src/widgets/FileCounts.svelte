<script>
  export let store;
  import { onMount, onDestroy } from 'svelte';

  function file_counts_summary_text(fileCounts) {
      let text = '';
      if (fileCounts && fileCounts.filecounts) {
          let filecounts = fileCounts.filecounts;
          let txts  = filecounts.txt || 0;
          let jpgs  = filecounts.jpg || 0;
          let mp4s  = filecounts.mp4 || 0;

          text = `${txts} txt${txts===1?'':'s'},
                  ${jpgs} jpg${jpgs===1?'':'s'},
                  ${mp4s} mp4${mp4s===1?'':'s'}`;

          let h264s = filecounts.h264 || 0;
          if (filecounts.h264) {
              text += `, ${h264s} h264${h264s===1?'':'s'}`;
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
  }
</style>
