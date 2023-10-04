<script>
  import { TabList, TabButton, TabContent, TabbedBox } from '$lib/tabs.js';
  import DownloadFiles from '$panels/DownloadFiles.svelte';
  import UploadFiles from '$panels/UploadFiles.svelte';

  let transferring = false;
  let disabled;
  $: disabled = transferring;
</script>

<TabbedBox>
  <TabList><TabButton {disabled}>Download Options</TabButton><TabButton {disabled}>Upload Options</TabButton></TabList>
  <TabContent>
    <DownloadFiles bind:transferring/>
  </TabContent>
  <TabContent>
    <UploadFiles bind:transferring/>
  </TabContent>
</TabbedBox>
