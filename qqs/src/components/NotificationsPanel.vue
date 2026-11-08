<template>
  <div class="notifications">
    <span>Area Objectives</span>
    <div v-for="(text, i) in shown" :key="i" class="bubble">
      {{ text }}<span v-if="i === typingIndex" class="cursor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = withDefaults(
  defineProps<{ messages: string[]; speed?: number; pause?: number }>(),
  { speed: 35, pause: 900 }
);

const shown = ref<string[]>([]);
const typingIndex = ref(-1);
let cancelled = false;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

onMounted(async () => {
  for (let i = 0; i < props.messages.length; i++) {
    if (cancelled) return;
    shown.value.push("");
    typingIndex.value = i;
    for (const ch of props.messages[i]) {
      if (cancelled) return;
      shown.value[i] += ch;
      await wait(props.speed);
    }
    typingIndex.value = -1;
    await wait(props.pause);
  }
});

onBeforeUnmount(() => (cancelled = true));
</script>

<style scoped>
.notifications {
  position: fixed;
  top: 16px;
  right: 100px;
  width: 280px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  z-index: 3;
  pointer-events: none;
}
.bubble {
  max-width: 100%;
  padding: 12px 20px;
  border-radius: 24px 24px 6px 24px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  font-size: 1.3rem;
  line-height: 1.3;
  animation: pop 0.2s ease-out;
}
.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.1em;
  background: #747d85;
  animation: blink 0.7s steps(1) infinite;
}
@keyframes pop {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>