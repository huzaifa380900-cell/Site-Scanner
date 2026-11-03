<template>
  <div id="scanner-app">
    <!-- This will contain the existing App.vue content -->
    <OriginalApp />
  </div>
</template>

<script setup>
import OriginalApp from '../OriginalApp.vue'
</script>

<style scoped>
#scanner-app {
  min-height: 100vh;
}
</style>