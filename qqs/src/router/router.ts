import { createRouter, createWebHistory } from "vue-router";
import { setupTransition } from "../transition.ts";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("../components/OpeningScreen.vue") },
    { path: "/home", component: () => import("../views/HomeView.vue") },
  ],
});

setupTransition(router);