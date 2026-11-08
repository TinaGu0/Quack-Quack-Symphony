<template>
  <div class="bg">
    <div
      v-for="i in lanes - 1"
      :key="i"
      class="separator"
      :style="{ left: i * (100 / lanes) + '%' }"
    />
    <div ref="line" class="line" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{ lanes: number }>();
const line = ref<HTMLElement>();
defineExpose({ line });
</script>

<style scoped>
.bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.separator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20%;
  height: 4px;
  background: white;
  z-index: 1;
}
</style>