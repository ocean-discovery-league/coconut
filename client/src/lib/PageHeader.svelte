<script>
  export let title;
</script>


<h2>
  <div class="img-box">
    <img height="80px" width="80px" src="/favicon.png" alt="ODL Logo"/>
  </div>
  {title}
</h2>


<style>
  h2 {
    font-size: 58px;
  }
  
  .img-box {
    outline: solid 1 grey;
    position: relative;
    display: inline-block;
    overflow: visible;
  }

  img {
    height: 80px;
    width: 80px;
    position: relative;
    top: 18px;
    right: 10px;
  }
</style>
