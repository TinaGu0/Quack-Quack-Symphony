import { ref, h, defineComponent } from "vue";
import { START_LOCATION, type Router } from "vue-router";

const COVER_MS = 600;  //switch page
const TOTAL_MS = 1000; // full length of the animation in ms
const run = ref(0);
const showing = ref(false);

export const TransitionOverlay = defineComponent(() => () =>
  showing.value
    ? h("img", {
        key: run.value,
        src: `/transition.png?run=${run.value}`,
        style:
          "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:100;",
      })
    : null
);

export function setupTransition(router: Router) {
  router.beforeEach((to, from) => {
    if (from === START_LOCATION || to.fullPath === from.fullPath) return;
    run.value++;
    showing.value = true;

    setTimeout(() => (showing.value = false), TOTAL_MS);

    return new Promise<void>((resolve) => setTimeout(resolve, COVER_MS));
  });
}