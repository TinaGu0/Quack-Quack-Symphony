<template>
  <div v-if="level === 9" class="ending-screen">
    <img src="/ending/ending.png" alt="Thank you for playing!" />
    <button class="ending-back" @click="emit('map')">← Level Map</button>
  </div>

  <div v-else class="overlay">
    <h1>Battle Complete!</h1>
    <h2>{{ accuracy }}% Accuracy</h2>
    <p>{{ rating }}</p>

    <p>Score: {{ score }}</p>
    <p>Hits: {{ hits }} | Missed: {{ misses }}</p>

    <button @click="emit('map')">Level Map</button>
    <button @click="emit('retry')">Retry</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  level: number;
  accuracy: number;
  rating: string;
  score: number;
  hits: number;
  misses: number;
}>();

const emit = defineEmits<{
  map: [];
  retry: [];
}>();
</script>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  background: #183c4dd9;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 25px;
}

.overlay button,
.ending-back {
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  font-family: "Lilita One", system-ui, sans-serif;
  font-size: 1rem;
  cursor: pointer;
}

.ending-screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #b9d778;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ending-screen img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ending-back {
  position: absolute;
  bottom: 24px;
  right: 24px;
}
</style>
