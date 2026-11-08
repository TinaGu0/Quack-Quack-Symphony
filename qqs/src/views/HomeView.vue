<template>
  <div class="home">
    <AreaMap :area="AREA" @near="near = $event" />
    <Notifications :messages="MESSAGES" />

    <div v-if="location" class="menu">
      <template v-for="c in location.choices" :key="c.label">
        <button v-if="!c.requiresTutorial || tutorial.done" @click="choose(c)">
          {{ c.label }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import AreaMap from "../components/AreaMap.vue";
import { AREA, LOCATIONS, type Choice } from "../areas";
import Notifications from "../components/NotificationsPanel.vue";
import { tutorial } from "../areas";

const MESSAGES = tutorial.done
  ? ["Now you're ready to take your first flight!"]
  : [
      "It's been cold lately, so lets help our feathered friend get to warmer weather!",
      "Walk to the other house start your journey. (wasd)",
    ];

const router = useRouter();
const near = ref<string | null>(null);
const location = computed(() => LOCATIONS.find((l) => l.id === near.value));

function choose(c: Choice) {
  if (!c.to) return;

  if (c.requiresTutorial && !tutorial.done) {
    router.push("/tutorial");
    return;
  }

  router.push(c.to === "/play" ? "/levels" : c.to);
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
