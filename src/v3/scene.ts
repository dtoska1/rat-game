import Phaser from 'phaser';
import wallUrl from './art/wall.webp?url';
import atlasUrl from './art/kitchen-atlas.webp?url';
import atlasData from './art/kitchen-atlas.json';
import {
  FLOOR,
  HEIGHT,
  HOME,
  containers,
  SPOON,
  STOOL_Y,
  WORLD,
  pastryX,
  ladderAt,
  rack,
  sampleX,
  stations,
  stool,
} from './level';
import { Chef } from './chef';
import { Rat } from './rat';
import { Pantry } from './interactions';
import { Controls } from './controls';
import { Sound } from './sound';

export type Mode = 'title' | 'play' | 'pause' | 'caught' | 'lost' | 'won';
export class GameScene extends Phaser.Scene {
  rat = new Rat();
  chef = new Chef();
  pantry = new Pantry();
  mode: Mode = 'title';
  visibleHeight = HEIGHT;
  private ratArt!: Phaser.GameObjects.Image;
  private chefArt!: Phaser.GameObjects.Image;
  private cargo!: Phaser.GameObjects.Image;
  private wall!: Phaser.GameObjects.Image;
  private chefSign!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private spoon!: Phaser.GameObjects.Image;
  private foods: Phaser.GameObjects.Image[] = [];
  private plates: Phaser.GameObjects.Ellipse[] = [];
  private containerArt: Phaser.GameObjects.Image[] = [];
  private baked!: Phaser.GameObjects.Image;
  private accumulator = 0;
  private camX = HOME;
  private endTime = 0;
  private runTime = 0;
  private hudClock = 0;
  private mark = 0;
  private renderMark = 0;
  private samples: number[][] = [];
  private moving = false;
  private coarse = matchMedia('(any-pointer:coarse)');
  readonly debug = new URLSearchParams(location.search).has('debug');
  constructor(
    public controls: Controls,
    public sfx: Sound,
    private onChange: () => void
  ) {
    super('KitchenV3');
  }
  preload() {
    this.load.image('wall', wallUrl);
    this.load.atlas('ink', atlasUrl, atlasData);
  }
  private art(
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    depth = 3
  ) {
    return this.add
      .image(x, y, 'ink', name)
      .setOrigin(0.5, 1)
      .setDisplaySize(w, h)
      .setDepth(depth);
  }
  private label(x: number, y: number, text: string, size = 15) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: size + 'px',
        fontStyle: 'bold',
        color: '#4a342e',
        backgroundColor: '#fff0cc',
        padding: { x: 7, y: 4 },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(11);
  }
  create() {
    this.wall = this.add
      .image(0, 0, 'wall')
      .setOrigin(0)
      .setDisplaySize(HEIGHT * 3, HEIGHT)
      .setDepth(-2);
    for (const s of stations) {
      const tableFrame = {
        eclair: 'table',
        macaron: 'mint-table',
        cake: 'lilac-table',
      }[s.kind];
      this.art(tableFrame, s.x, FLOOR, s.width, FLOOR - s.top);
      this.art('stool', stool(s), FLOOR, 142, FLOOR - STOOL_Y, 4);
      this.art('ladder', rack(s), STOOL_Y + 3, 46, STOOL_Y - s.top + 6, 4);
      const x = pastryX(s);
      const rim = this.add
        .ellipse(x, s.top - 2, 92, 10, 0xffedb0)
        .setStrokeStyle(2, 0x8a6254)
        .setDepth(4);
      this.plates.push(rim);
      this.foods.push(
        this.art(
          s.kind,
          x,
          s.top - 5,
          s.kind === 'cake' ? 72 : 83,
          s.kind === 'cake' ? 79 : 45,
          5
        )
      );
      this.add
        .ellipse(sampleX(s), s.top - 1, 60, 7, 0xe1e4dc)
        .setStrokeStyle(1, 0x7c6861)
        .setDepth(4);
      this.art(s.kind, sampleX(s) - 6, s.top - 4, 28, 19, 5);
      this.art(s.kind, sampleX(s) + 10, s.top - 4, 22, 16, 5);
    }
    this.art('home', HOME, FLOOR + 4, 162, 116, 3);
    this.label(HOME, FLOOR - 119, 'HOME', 13);
    this.containerArt = containers.map((p) =>
      this.art(p.frame, p.x, FLOOR + 1, p.width, p.height, 5)
    );
    this.spoon = this.art('spoon', SPOON, FLOOR, 89, 96, 4);
    this.chefArt = this.art('chef-walk', this.chef.x, FLOOR, 160, 215, 5);
    this.ratArt = this.art('rat-idle', HOME, FLOOR, 68, 59, 7);
    this.cargo = this.art('eclair', 0, 0, 61, 34, 8).setVisible(false);
    this.baked = this.art('ending', 0, 0, 93, 95, 9).setVisible(false);
    this.chefSign = this.label(0, 0, '?', 20);
    this.hint = this.label(0, 0, '', 14);
    this.syncView(true);
    this.game.events.on(Phaser.Core.Events.PRE_STEP, () => {
      this.mark = performance.now();
    });
    this.game.events.on(Phaser.Core.Events.PRE_RENDER, () => {
      this.renderMark = performance.now();
    });
    this.game.events.on(Phaser.Core.Events.POST_RENDER, () => {
      if (
        this.debug &&
        this.mode === 'play' &&
        this.moving &&
        this.samples.length < 20000
      ) {
        const end = performance.now();
        this.samples.push([
          this.game.loop.rawDelta,
          end - this.mark,
          end - this.renderMark,
        ]);
      }
    });
    this.scale.on('resize', () => this.syncView(true));
    this.onChange();
  }
  start() {
    this.rat = new Rat();
    this.chef = new Chef();
    this.pantry = new Pantry();
    this.accumulator = 0;
    this.runTime = 0;
    this.endTime = 0;
    this.samples = [];
    this.controls.clear();
    this.controls.enabled = true;
    this.mode = 'play';
    this.sfx.unlock();
    this.pantry.tell('← Find the pink pastry table');
    this.syncView(true);
    this.onChange();
  }
  pause() {
    if (this.mode !== 'play' && this.mode !== 'pause') return;
    this.mode = this.mode === 'play' ? 'pause' : 'play';
    this.controls.clear();
    this.controls.enabled = this.mode === 'play';
    this.onChange();
  }
  update(_time: number, delta: number) {
    if (!this.ratArt) return;
    const dt = Math.min(delta / 1000, 0.08);
    if (this.mode === 'caught') {
      this.endTime += dt;
      const t = this.endTime;
      if (t >= 0.85 && t - dt < 0.85) {
        this.sfx.play('take');
        this.chefSign.setText('Voilà!');
      }
      this.chefArt
        .setFrame('chef-bake')
        .setDisplaySize(180, 217)
        .setAngle(Math.sin(t * 10) * 4);
      this.cargo.setVisible(false);
      this.ratArt
        .setVisible(t < 0.85)
        .setFrame('rat-scared')
        .setDisplaySize(65, 69)
        .setPosition(this.rat.x, FLOOR - Math.min(103, t * 175))
        .setAngle(-Math.min(34, t * 45));
      this.baked
        .setVisible(t >= 0.85)
        .setPosition(this.rat.x, FLOOR - 65 - Math.abs(Math.sin(t * 7)) * 7)
        .setAngle(Math.sin(t * 7) * 6);
      if (t > 2.1) {
        this.mode = 'lost';
        this.onChange();
      }
      return;
    }
    if (this.mode !== 'play') return;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 120 && this.mode === 'play') {
      this.tick(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.syncView(false, dt);
    this.hudClock += dt;
    if (this.hudClock >= 0.08) {
      this.hudClock = 0;
      this.onChange();
    }
  }
  private tick(dt: number) {
    const r = this.rat,
      p = this.pantry;
    this.runTime += dt;
    p.clang = Math.max(0, p.clang - dt);
    p.messageTime = Math.max(0, p.messageTime - dt);
    const chefMode = this.chef.mode;
    const vy = r.vy,
      boost = r.boosting;
    r.update(dt, this.controls);
    if (vy >= 0 && r.vy < -280) this.sfx.play('jump');
    if (!boost && r.boosting) this.sfx.play('boost');
    if (this.controls.take('act')) p.use(r, this.chef, this.sfx);
    if (p.delivered.size === 3) {
      this.mode = 'won';
    } else if (this.chef.update(dt, r)) {
      this.mode = 'caught';
      this.sfx.play('caught');
    }
    if (this.chef.mode !== chefMode && this.mode === 'play') this.onChange();
    if (this.mode !== 'play') {
      this.controls.clear();
      this.controls.enabled = false;
      this.onChange();
    }
  }
  private syncView(snap: boolean, dt = 0) {
    if (!this.wall) return;
    const r = this.rat,
      c = this.chef;
    const camera = this.cameras.main;
    const zoom = Math.max(
      this.scale.height / this.visibleHeight,
      this.scale.width / WORLD
    );
    if (camera.zoom !== zoom) camera.setZoom(zoom);
    const w = this.scale.width / zoom,
      h = this.scale.height / zoom;
    const half = w * 0.5;
    const clamped = (x: number) => Math.max(half, Math.min(WORLD - half, x));
    const look = r.x + r.facing * Math.min(105, w * 0.12);
    const gap = look - this.camX,
      zone = Math.min(64, w * 0.09);
    if (snap) this.camX = clamped(look);
    else if (Math.abs(gap) > zone)
      this.camX = clamped(
        this.camX + (gap - Math.sign(gap) * zone) * (1 - Math.exp(-7 * dt))
      );
    const left = this.camX - half;
    const top = Math.max(0, Math.min(FLOOR + 48 - h, r.y - 0.34 * h));
    camera.scrollX = this.camX - this.scale.width * 0.5;
    const scrollY = top + (h - this.scale.height) * 0.5;
    camera.scrollY = snap
      ? scrollY
      : camera.scrollY + (scrollY - camera.scrollY) * (1 - Math.exp(-12 * dt));
    const wallWidth = Math.max(HEIGHT * 3, w);
    if (this.wall.displayWidth !== wallWidth)
      this.wall.setDisplaySize(wallWidth, wallWidth / 3);
    this.wall.x = left - (left * (wallWidth - w)) / Math.max(1, WORLD - w);
    this.moving = Math.abs(r.vx) > 30 || r.climbed;
    const bob = Math.sin(r.phase);
    const frame = r.hidden
      ? 'rat-hide'
      : r.climbed
        ? 'rat-climb'
        : r.carried
          ? 'rat-carry'
          : r.pose === 'jump' || r.pose === 'sprint'
            ? 'rat-jump'
            : r.eating
              ? 'rat-eat'
              : this.moving && bob > -0.15
                ? 'rat-walk'
                : 'rat-idle';
    const small = r.hidden ? 0.69 : 1;
    this.baked.setVisible(false);
    this.ratArt
      .setVisible(true)
      .setFrame(frame)
      .setFlipX(r.facing < 0)
      .setAlpha(r.hidden ? 0.75 : 1)
      .setScale(
        ((58 + (this.moving ? bob * 2 : Math.sin(r.phase) * 1.5)) * small) /
          this.ratArt.frame.realHeight
      )
      .setPosition(
        r.x,
        r.y - (this.moving && r.grounded ? Math.abs(bob) * 3 : 0)
      )
      .setAngle(
        r.pose === 'climb'
          ? Math.sin(r.y * 0.12) * 5
          : r.eating
            ? bob * 5
            : r.carried
              ? (3 + bob * 3) * r.facing
              : 0
      );
    this.containerArt.forEach((image, i) => {
      const depth = r.hidden === containers[i].name ? 9 : 5;
      if (image.depth !== depth) image.setDepth(depth);
    });
    this.chefArt
      .setFrame(
        this.mode === 'caught'
          ? 'chef-bake'
          : c.grab > 0
            ? 'chef-search'
            : c.mode === 'chase'
              ? 'chef-chase'
              : c.mode === 'patrol'
                ? 'chef-walk'
                : 'chef-search'
      )
      .setScale(217 / this.chefArt.frame.realHeight)
      .setFlipX(c.facing < 0)
      .setPosition(c.x, FLOOR - Math.abs(Math.sin(c.phase)) * 3)
      .setAngle(Math.sin(c.phase) * 2);
    this.chefSign.setVisible(c.mode !== 'patrol').setPosition(c.x, FLOOR - 222);
    const sign =
      c.grab > 0
        ? 'Grab!'
        : c.mode === 'chase'
          ? '!'
          : c.mode === 'investigate' && this.pantry.clang > 0
            ? 'CLANG?'
            : c.mode === 'search'
              ? '…'
              : '?';
    if (this.chefSign.text !== sign) this.chefSign.setText(sign);
    this.spoon.setAngle(
      this.pantry.clang > 6 ? Math.sin(this.pantry.clang * 18) * 8 : 0
    );
    stations.forEach((s, i) => {
      const visible =
        !this.pantry.delivered.has(s.kind) && r.carried?.kind !== s.kind;
      this.foods[i].setVisible(visible);
      this.plates[i].setFillStyle(
        r.energy === 100 && visible ? 0xffc75a : 0xfbe7bb
      );
    });
    this.cargo.setVisible(!!r.carried && !r.hidden);
    if (r.carried)
      this.cargo
        .setFrame(r.carried.kind)
        .setDisplaySize(57, r.carried.kind === 'cake' ? 50 : 31)
        .setPosition(r.x + r.facing * 31, r.y - 9 - Math.abs(bob) * 2);
    const nearLadder = ladderAt(r.x, r.y);
    const context = this.pantry.choose(r);
    const msg =
      context.label ||
      (nearLadder
        ? this.coarse.matches
          ? 'Tap Jump to climb'
          : '↑ Climb'
        : r.hidden
          ? 'Hidden'
          : '');
    const display =
      msg && this.mode === 'play'
        ? (context.action === 'none'
            ? ''
            : this.controls.down('act')
              ? ''
              : 'E · ') + msg
        : '';
    // On phones the matching contextual action is also printed on the thumb button.
    const label = this.coarse.matches ? display.replace(/^E · /, '') : display;
    if (this.hint.text !== label) this.hint.setText(label);
    this.hint
      .setVisible(!!label)
      .setPosition(
        Math.max(
          left + this.hint.width / 2 + 4,
          Math.min(left + w - this.hint.width / 2 - 4, r.x)
        ),
        r.y - (r.hidden ? 46 : 76)
      );
  }
  snapshot() {
    const r = this.rat,
      c = this.chef,
      p = this.pantry;
    return {
      mode: this.mode,
      t: +this.runTime.toFixed(2),
      x: Math.round(r.x),
      y: Math.round(r.y),
      vx: Math.round(r.vx),
      vy: Math.round(r.vy),
      pose: r.pose,
      hidden: r.hidden,
      energy: Math.round(r.energy),
      carried: r.carried?.kind ?? null,
      delivered: [...p.delivered],
      action: p.choose(r).action,
      chef: c.mode,
      chefX: Math.round(c.x),
      facing: c.facing,
      seen: c.seen,
      alert: Math.round(c.alert * 100),
      held: this.controls.names(),
      last: p.last,
    };
  }
  timing() {
    const summary = (i: number) => {
      const v = this.samples.map((s) => s[i]).sort((a, b) => a - b);
      return {
        median: +(v[Math.floor(v.length * 0.5)] ?? 0).toFixed(2),
        p95: +(v[Math.floor(v.length * 0.95)] ?? 0).toFixed(2),
      };
    };
    return {
      movingFrames: this.samples.length,
      intervalMs: summary(0),
      gameStepMs: summary(1),
      rendererSubmitMs: summary(2),
    };
  }
}
