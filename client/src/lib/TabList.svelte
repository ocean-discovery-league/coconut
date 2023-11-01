<nav class="tablist">
  <slot></slot>
</nav>


<style>
  .tablist {
    width: 600px;
    height: 30px;
  }

  /*
  :global(.tablist:first-child button) {
    text-align: right;
  }

  :global(.tablist:not(:first-child) button) {
    text-align: left;
  }
  */
</style>
