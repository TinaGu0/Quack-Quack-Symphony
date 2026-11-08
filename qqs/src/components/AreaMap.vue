<template>
  <div ref="container" class="area" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import Phaser from "phaser";
import type { Area } from "../areas";

const props = defineProps<{ area: Area }>();
const emit = defineEmits<{ near: [name: string | null] }>();

const GOOSE = { scale: 0.15, speed: 60 };
const DIRS = ["Back", "Front", "Left", "Right"];
const FRAMES = ["idle", "walk1", "walk2"];
const ZOOM = 4;

const container = ref<HTMLDivElement>();
let game: Phaser.Game;

class AreaScene extends Phaser.Scene {
  private goose!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private zones: { name: string; rect: Phaser.Geom.Rectangle }[] = [];
  private current: string | null = null;
  private facing = "Front";

  constructor() { super("Area"); }

  preload() {
    this.load.tilemapTiledJSON("map", props.area.map);
    props.area.tilesets.forEach((t) => this.load.image(t.name, `maps/${t.file}`));
    DIRS.forEach((d) =>
      FRAMES.forEach((f) => this.load.image(`${d}-${f}`, `goose/${d}/${f}.png`))
    );
  }

  create() {
    const map = this.make.tilemap({ key: "map" });
    const sets = props.area.tilesets.map((t) => map.addTilesetImage(t.name, t.name)!);

    const layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};
    map.layers.forEach((l) => {
      layers[l.name] = map.createLayer(l.name, sets) as Phaser.Tilemaps.TilemapLayer;
    });

    const sp = map.getObjectLayer("spawn")?.objects[0];
    this.goose = this.physics.add.sprite(
      sp?.x ?? map.widthInPixels / 2,
      sp?.y ?? map.heightInPixels / 2,
      "Front-idle"
    );
    this.goose.setScale(GOOSE.scale).setCollideWorldBounds(true).setDepth(5);
    this.goose.body!.setSize(40, 20).setOffset(44, 100); // keep your tuned hitbox values here

    DIRS.forEach((d) =>
      this.anims.create({
        key: `walk-${d}`,
        frames: [{ key: `${d}-walk1` }, { key: `${d}-walk2` }],
        frameRate: 6,
        repeat: -1,
      })
    );

    props.area.solid.forEach((n) => {
      const l = layers[n];
      if (!l) return;
      l.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.goose, l);
    });
    layers["trees"]?.setDepth(10);

    this.zones = (map.getObjectLayer("interact")?.objects ?? []).map((o) => ({
      name: o.name,
      rect: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!),
    }));

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(ZOOM).startFollow(this.goose, true, 0.1, 0.1);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as any;
  }

  update() {
    const hit = this.zones.find((z) => z.rect.contains(this.goose.x, this.goose.y));
    const name = hit?.name ?? null;
    if (name !== this.current) {
      this.current = name;
      emit("near", name);
    }

    const c = this.cursors, k = this.wasd;
    const x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
    const y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);

    this.goose.setVelocity(x * GOOSE.speed, y * GOOSE.speed);
    this.goose.body!.velocity.normalize().scale(GOOSE.speed);

    if (x || y) {
      if (y < 0) this.facing = "Back";
      else if (y > 0) this.facing = "Front";
      else this.facing = x < 0 ? "Left" : "Right";
      this.goose.anims.play(`walk-${this.facing}`, true);
    } else {
      this.goose.anims.stop();
      this.goose.setTexture(`${this.facing}-idle`);
    }
  }
}

onMounted(() => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container.value,
    width: 1280,
    height: 720,
    pixelArt: true,
    backgroundColor: "#1a1a2e",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { debug: false } },
    scene: AreaScene,
  });
});
onBeforeUnmount(() => game?.destroy(true));
</script>

<style scoped>
.area { 
    position: absolute; inset: 0;
    background: #3b3626;
 }
</style>