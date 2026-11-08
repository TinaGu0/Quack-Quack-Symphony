<template>
  <div class="home">
    <AreaMap :area="AREA" @near="near = $event" />

    <div v-if="near === 'home'" class="menu">
      <button>Take flight</button>
      <button>Stay</button>
    </div>

    <div v-else-if="near === 'tutorial'" class="menu">
      <button @click="router.push('/tutorial')">Tutorial</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import AreaMap from "../components/AreaMap.vue";
import { AREA} from "../areas";

const router = useRouter();
const near = ref<string | null>(null);
</script>

<style scoped>
.home { position: fixed; inset: 0; }
.menu {
  position: absolute;
  top: 50%;
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
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #3b82c4;
  font-size: 1.5rem;
  cursor: pointer;
}
</style>