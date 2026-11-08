<template>
  <div class="home">
    <AreaMap :area="AREA" @near="near = $event" />
    <Notifications :messages="MESSAGES" />

    <div v-if="location?.id === 'tutorial'" class="menu">
      <button @click="handleDoor">
        {{ tutorial.done ? "Take Flight" : "Tutorial" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import AreaMap from "../components/AreaMap.vue";
import { AREA, LOCATIONS, tutorial } from "../areas";
import Notifications from "../components/NotificationsPanel.vue";

const MESSAGES = tutorial.done
  ? ["Now you're ready to take your first flight!"]
  : [
      "It's been cold lately, so lets help our feathered friend get to warmer weather!",
      "Walk to the other house to start your journey. (WASD)",
    ];

const router = useRouter();
const near = ref<string | null>(null);
const location = computed(() => LOCATIONS.find((l) => l.id === near.value));

function handleDoor() {
  if (!location.value) return;

  if (!tutorial.done) {
    router.push("/tutorial");
    return;
  }

  router.push("/levels");
}
</script>

<style scoped>
.home {
  position: fixed;
  inset: 0;
}
.menu {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2;
}
.menu button {
  padding: 12px 40px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  font-size: 1.5rem;
  cursor: pointer;
}
</style>
