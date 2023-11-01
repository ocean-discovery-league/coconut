<script>
  export let disabled = false;
  export let width = '250px';
  import { getContext } from 'svelte';
  import { TABS } from '$panels/TabbedBox.svelte';

  const tab = {};
  const { registerTab, selectTab, selectedTab } = getContext(TABS);

  registerTab(tab);
</script>


<button class="tab" style="width:{width}" class:selected="{$selectedTab === tab}" on:click="{() => {console.log('clickkkk!');selectTab(tab);}}" {disabled}>
  <slot></slot>
</button>


<style>
  .tab {
    display: inline-block;
    border: 2px solid var(--odl-gray-3);
    font-size: 20px;
    width: 250px;
    height: 40px;
    color: var(--odl-gray-3);
    background-color: transparent;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }

  .tab:not(:first-child) {
    position: relative;
    left: -1px;
  }

  .tab.selected {
    color: var(--odl-brand-5);
    background-color: var(--odl-gray-3);

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
