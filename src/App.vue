<!-- src/App.vue -->
<template>
  <Board />
</template>

<script setup lang="ts">
import Board from './components/MyBoard.vue'
</script>

<style>
html,
body,
#app {
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
}
#app {
  display: flex;
  justify-content: center;
  /* align-items: center; */
}
</style>
