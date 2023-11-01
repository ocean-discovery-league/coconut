<script>
  import { getContext } from 'svelte';
  import { TABS } from '$panels/TabbedBox.svelte';

  const panel = {};
  const { registerPanel, selectedPanel } = getContext(TABS);

  registerPanel(panel);
</script>


<!-- {#if $selectedPanel === panel} -->  <!-- i use css to hide & show instead of recreating them -jon -->
  <div class="tabcontent" class:selected="{$selectedPanel === panel}">
    <slot></slot>
  </div>
<!-- {/if} -->


<style>
  .tabcontent {
    margin-top:30px;
    display: none;
  }

  .selected {
    display: block;
  }
</style>
