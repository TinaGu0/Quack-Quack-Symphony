import { reactive, watch } from "vue";

export type Area = {
  id: number;
  season: string;
  map: string;                                   // path under public/
  tilesets: { name: string; file: string }[];    // name = Tiled tileset name, file = PNG in public/maps/
  solid: string[];                               // layers the goose can't walk through
};

export const AREAS: Area[] = [
  {
    id: 1,
    season: "Autumn",
    map: "maps/overworld.tmj",
    tilesets: [
    { name: "dirt_path", file: "dirt_path.png" },
    { name: "fall_grass", file: "fall_grass.png" },
    { name: "fall_trees", file: "fall_trees.png" },
    { name: "grey_brick_houses_with_doors_grass", file: "grey_brick_houses_with_doors_grass.png" },
    { name: "Fences", file: "Fences.png" },
    { name: "Water", file: "Water.png" },
    { name: "Tilled Dirt", file: "Tilled Dirt.png" },
    { name: "Cherry Blossom Biom", file: "Cherry Blossom Biom.png" },
    { name: "Farming Plants v2", file: "Farming Plants v2.png" },
    ],
    solid: ["water", "houses", "trees"],
  },
];

const KEY = "qqs-progress";
export const progress = reactive<{ currentArea: number }>({
  currentArea: 1,
  ...JSON.parse(localStorage.getItem(KEY) ?? "{}"),
});
watch(progress, () => localStorage.setItem(KEY, JSON.stringify(progress)), { deep: true });