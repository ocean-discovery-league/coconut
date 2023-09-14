// https://svelte.dev/repl/8e68120858e5322272dc9136c4bb79cc?version=3.5.1
export { default as TabList } from '$lib/TabList.svelte';
export { default as TabButton } from '$lib/TabButton.svelte';
export { default as TabContent } from '$lib/TabContent.svelte';
export { default as TabbedBox } from '$panels/TabbedBox.svelte';


/* example: */
/*
<script>
  import { TabList, TabButton, TabContent, TabbedBox } from './tabs.js';
</script>

<TabbedBox>
  <TabList>
    <TabButton>one</TabButton>
    <TabButton>two</TabButton>
    <TabButton>three</TabButton>
  </TabList>
  <TabContent>
    <h2>First panel</h2>
  </TabContent>
  <TabContent>
    <h2>Second panel</h2>
  </TabContent>
  <TabContent>
    <h2>Third panel</h2>
  </TabContent>
</TabbedBox>
*/
