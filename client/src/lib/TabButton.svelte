<script>
  export let disabled = false;
  import { getContext } from 'svelte';
  import { TABS } from '$panels/TabbedBox.svelte';

  const tab = {};
  const { registerTab, selectTab, selectedTab } = getContext(TABS);

  registerTab(tab);
</script>


<button class="tab" class:selected="{$selectedTab === tab}" on:click="{() => selectTab(tab)}" {disabled}>
  <slot></slot>
</button>


<style>
  .tab {
    display: inline-block;
    border: 2px solid gray;
    font-size: 20px;
    width: 250px;
    height: 30px;
    color: gray;
    background-color: transparent;
  }

  .tab:not(:first-child) {
    position: relative;
    left: -1px;
  }

  .tab.selected {
    color: #1A4565;
    background-color: gray;
  }

  .locked .tab {
  }

  .tab:disabled,
  .tab[disabled] {
    opacity: 0.3;
    /* cursor: wait; */
    cursor: not-allowed;
  }    

  .tab:disabled.selected {
  }
</style>
