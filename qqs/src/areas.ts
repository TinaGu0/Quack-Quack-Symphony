export type Area = {
  map: string;
  tilesets: { name: string; file: string }[];
  solid: string[];
};

export const AREA: Area = {
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
};