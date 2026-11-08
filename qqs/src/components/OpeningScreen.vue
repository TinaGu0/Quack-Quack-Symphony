<template>
  <div class="opening">
    <!-- 1. opening screen -->
    <img v-if="phase === 'opening'" class="layer" src="/opening/opening-screen.png" alt="" />

    <!-- 2. duck + static title + play button -->
    <template v-else>
      <video
        class="layer"
        src="/opening/duck-floating.mov"
        autoplay
        loop
        muted
        playsinline
      />
      <img class="layer" src="/opening/static-title.png" alt="" />
      <button class="play" @click="router.push('/home')">
        <span>Play</span>
        </button>
        </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();

const props = withDefaults(defineProps<{ openingDuration?: number }>(), {
  openingDuration: 1000, // ms length of the opening-screen animation
});
const emit = defineEmits<{ start: [] }>();

const phase = ref<"opening" | "title">("opening");
let timer = 0;

onMounted(() => {
  timer = window.setTimeout(() => (phase.value = "title"), props.openingDuration);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>

.opening {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
  user-select: none;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.play {
  position: absolute;
  right: 20%;
  bottom: 15%;
  transform: translateY(50%);
  width: 200px;
  height: 90px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.play::before,
.play::after {
  content: "";
  position: absolute;
  background: #fff;
  border-radius: 50%;
}
.play::before {            /* big puff */
  width: 90px;
  height: 90px;
  top: -38px;
  left: 28px;
}
.play::after {             /* small puff */
  width: 66px;
  height: 66px;
  top: -26px;
  right: 30px;
}
.play span {
  position: relative;      /* keeps the text above the puffs */
  z-index: 1;
  color: #7EC0ED;
  font-size: 2.5rem;
  font-weight: 700;
}
</style>