import { createRouter, createWebHistory } from "vue-router";
import { setupTransition } from "../transition";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("../components/OpeningScreen.vue") },
    { path: "/home", component: () => import("../views/HomeView.vue") },
    { path: "/tutorial", component: () => import("../views/TutorialView.vue") },
  ],
});

setupTransition(router);