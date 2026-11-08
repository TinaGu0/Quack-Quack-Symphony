import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("../components/OpeningScreen.vue") },
    { path: "/home", component: () => import("../views/HomeView.vue") },
  ],
});