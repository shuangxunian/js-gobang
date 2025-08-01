<!-- src/components/Cell.vue -->
<template>
  <div class="cell" @click="handleClick">
    <div v-if="value === 'black'" class="piece black"></div>
    <div v-else-if="value === 'white'" class="piece white"></div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{
  value: 'black' | 'white' | null;
  row: number;
  col: number;
}>();
const emit = defineEmits<{
  (e: 'select', row: number, col: number): void
}>();
function handleClick() {
  if (!props.value) emit('select', props.row, props.col);
}
</script>

<style scoped>
.cell {
  width: 30px; height: 30px;
  border: 1px solid #333;
  position: relative;
}
.piece {
  width: 100%; height: 100%; border-radius: 50%;
}
.piece.black { background: black; }
.piece.white { background: white; }
</style>
