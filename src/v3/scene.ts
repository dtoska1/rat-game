import Phaser from 'phaser';
import wallUrl from '../assets/room.png?url';
import cheeseUrl from '../assets/cheese.png?url';
import atlasUrl from './art/kitchen-atlas.webp?url';
import atlasData from './art/kitchen-atlas.json';
import {
  FLOOR,
  cheeseCaches,
  gadgets,
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
import { MopBot, SteamVents, STEAM_VENTS } from './chaos';
import { Rat } from './rat';
import { Pantry } from './interactions';
import { Controls } from './controls';
import { Sound } from './sound';

export type Mode = 'title' | 'play' | 'pause' | 'caught' | 'lost' | 'won';
export class GameScene extends Phaser.Scene {
  rat = new Rat();
  chef = new Chef();
  pantry = new Pantry();
  mop = new MopBot();
  guardMop = new MopBot(820, 470, 1190, 160);
  steam = new SteamVents();
  mode: Mode = 'title';
  playStyle: 'classic' | 'chaos' = 'classic';
  failureReason: 'chef' | 'alarm' = 'chef';
  visibleHeight = HEIGHT;
  private ratArt!: Phaser.GameObjects.Image;
  private chefArt!: Phaser.GameObjects.Image;
  private cargo!: Phaser.GameObjects.Image;
  private wall!: Phaser.GameObjects.Image;
  private chefSign!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private spoon!: Phaser.GameObjects.Image;
  private foods: Phaser.GameObjects.Image[] = [];
  private cheeseArt: Phaser.GameObjects.Image[] = [];
  private mopArt!: Phaser.GameObjects.Container;
  private guardMopArt!: Phaser.GameObjects.Container;
  private ventArt: {
    plate: Phaser.GameObjects.Container;
    warning: Phaser.GameObjects.Graphics;
    hot: Phaser.GameObjects.Graphics;
  }[] = [];
  private gadgetArt: Phaser.GameObjects.Container[] = [];
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
    this.load.image('vintage-cheese', cheeseUrl);
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
      .setDisplaySize((HEIGHT * 1600) / 680, HEIGHT)
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
    this.cheeseArt = cheeseCaches.map((cache) =>
      this.add
        .image(cache.x, cache.y - 5, 'vintage-cheese')
        .setOrigin(0.5, 1)
        .setDisplaySize(62, 48)
        .setDepth(6)
        .setVisible(false)
    );
    // Hand-drawn-style, lightweight vector props: animated mop bot and
    // three interactive prank stations, separate from the classic wall art.
    const robot = this.add.graphics();
    robot.fillStyle(0x60474e).fillCircle(-26, -9, 13).fillCircle(26, -9, 13);
    robot.fillStyle(0xa9d9ca).fillRoundedRect(-43, -42, 86, 33, 13);
    robot.lineStyle(3, 0x60474e).strokeRoundedRect(-43, -42, 86, 33, 13);
    robot.fillStyle(0xffffff).fillCircle(-13, -27, 7).fillCircle(12, -27, 7);
    robot.fillStyle(0x493842).fillCircle(-12, -27, 3).fillCircle(13, -27, 3);
    robot.lineStyle(3, 0x60474e).lineBetween(-7, -18, 6, -18);
    this.mopArt = this.add.container(this.mop.x, FLOOR, [robot])
      .setDepth(8).setVisible(false);
    // Hard Chaos adds a second mop in the far aisle. Both share the MOP breaker.
    const guard = this.add.graphics();
    guard.fillStyle(0x62474c).fillCircle(-23, -8, 12).fillCircle(23, -8, 12);
    guard.fillStyle(0xed9c8e).fillRoundedRect(-39, -41, 78, 32, 12);
    guard.lineStyle(3, 0x62474c).strokeRoundedRect(-39, -41, 78, 32, 12);
    guard.fillStyle(0xffffff).fillCircle(-12, -27, 6).fillCircle(12, -27, 6);
    guard.fillStyle(0x62474c).fillCircle(-12, -27, 3).fillCircle(12, -27, 3);
    this.guardMopArt = this.add.container(this.guardMop.x, FLOOR, [guard])
      .setDepth(8).setVisible(false);
    // Fixed vector artwork is built once; only visibility changes each frame.
    // Amber is a warning, red steam damages only rats running on the floor.
    this.ventArt = STEAM_VENTS.map((vent) => {
      const grate = this.add.graphics();
      grate.fillStyle(0x71646a).fillRoundedRect(-44, -11, 88, 13, 5);
      grate.lineStyle(2, 0x493d42).strokeRoundedRect(-44, -11, 88, 13, 5);
      for (let d = -27; d < 36; d += 18)
        grate.lineStyle(3, 0xc0a6a1).lineBetween(d, -9, d, -2);
      const warning = this.add.graphics();
      warning.fillStyle(0xffc448, 0.75).fillEllipse(0, -35, 86, 65);
      warning.fillStyle(0x5a372b).fillCircle(0, -35, 7);
      const hot = this.add.graphics();
      hot.fillStyle(0xff8e63, 0.36).fillEllipse(0, -49, 92, 100);
      hot.fillStyle(0xffcab6, 0.65).fillEllipse(-13, -77, 38, 55);
      hot.fillStyle(0xffd8c2, 0.7).fillEllipse(17, -66, 33, 58);
      hot.fillStyle(0xff9a72, 0.7).fillCircle(1, -109, 16);
      const plate = this.add.container(vent.x, FLOOR, [grate, warning, hot])
        .setDepth(8).setVisible(false);
      return { plate, warning, hot };
    });
    this.gadgetArt = gadgets.map((g) => {
      const sketch = this.add.graphics();
      sketch.fillStyle(0x62474c).fillRoundedRect(-37, -52, 74, 44, 7);
      sketch.fillStyle(g.color).fillRoundedRect(-33, -49, 66, 36, 5);
      sketch.lineStyle(2, 0x62474c).strokeRoundedRect(-33, -49, 66, 36, 5);
      sketch.fillStyle(0xffffff).fillCircle(24, -44, 3);
      const tag = this.add.text(0, -31, g.short, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold',
        color: '#4a3239', resolution: 2,
      }).setOrigin(0.5);
      return this.add.container(g.x, FLOOR, [sketch, tag])
        .setDepth(7).setVisible(false);
    });
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
  start(style: 'classic' | 'chaos' = 'classic') {
    this.playStyle = style;
    this.rat = new Rat();
    this.chef = new Chef();
    this.pantry = new Pantry();
    this.pantry.hardMode = style === 'chaos';
    this.mop = new MopBot();
    this.guardMop = new MopBot(820, 470, 1190, 160);
    this.steam = new SteamVents();
    if (style === 'chaos') {
      // A separate quick-start route lets players interact with every new
      // mechanic immediately while keeping the full three-pastry story intact.
      this.pantry.delivered = new Set(stations.map((station) => station.kind));
      this.pantry.phase = 'cheese';
      this.rat.energy = 65;
    }
    this.accumulator = 0;
    this.runTime = 0;
    this.endTime = 0;
    this.failureReason = 'chef';
    this.samples = [];
    this.controls.clear();
    this.controls.enabled = true;
    this.mode = 'play';
    this.sfx.unlock();
    this.pantry.tell(style === 'chaos'
      ? 'HARD CHAOS! Dodge both mops and timed steam jets! ←'
      : '← Find the pink pastry table');
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
    this.accumulator = Math.min(this.accumulator + dt, 5 / 120);
    let steps = 0;
    while (this.accumulator >= 1 / 120 && this.mode === 'play' && steps++ < 5) {
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
    p.mopDisabled = Math.max(0, p.mopDisabled - dt);
    p.squeakCooldown = Math.max(0, p.squeakCooldown - dt);
    const chefMode = this.chef.mode;
    const vy = r.vy,
      boost = r.boosting;
    r.update(dt, this.controls);
    if (vy >= 0 && r.vy < -280) this.sfx.play('jump');
    if (!boost && r.boosting) this.sfx.play('boost');
    if (this.controls.take('act')) p.use(r, this.chef, this.sfx);
    if (this.controls.take('squeak')) p.squeak(r, this.chef, this.sfx);
    const hard = this.playStyle === 'chaos';
    const pace = hard ? 1.3 + p.cheeseFound.size * 0.13 : 1;
    if (this.mop.update(dt, r, p.phase === 'cheese', p.mopDisabled > 0,
      pace, hard ? 20 : 16)) {
      p.mopHits++;
      this.chef.distract(this.mop.x);
      p.tell(hard ? 'BONK! The fast mop took 20 energy!' :
        'BONK! Jump over the mop bot or switch it off. −16 energy');
      this.sfx.play('spoon');
    }
    if (hard && this.guardMop.update(dt, r, true, p.mopDisabled > 0,
      1.12 + p.cheeseFound.size * 0.11, 20)) {
      p.mopHits++;
      this.chef.distract(this.guardMop.x);
      p.tell('BONK! The second mop caught you. −20 energy');
      this.sfx.play('spoon');
    }
    const ventHit = this.steam.update(dt, r, hard);
    if (ventHit !== null) {
      this.chef.distract(ventHit);
      p.tell('PSSSH! Steam burnt 13 energy. Watch for amber warnings!');
      this.sfx.play('spoon');
    }
    if (p.phase === 'cheese' && r.y < FLOOR - 65 && Math.abs(r.x - this.mop.x) < 92 && p.mopDisabled <= 0)
      p.notebook.stamp('mop');
    if (r.hidden === 'Teapot' && Math.abs(this.chef.x - 1830) < 220)
      p.notebook.stamp('teapot');
    if (p.startEscape()) {
      if (hard) {
        p.escapeLeft = 38;
        p.tell('HARD ESCAPE! Only 38 seconds to reach home!');
      }
      this.sfx.play('spoon');
    }
    if (p.escapeActive && !p.complete) {
      p.escapeLeft = Math.max(0, p.escapeLeft - dt);
      if (p.escapeLeft === 0) {
        this.failureReason = 'alarm';
        this.mode = 'lost';
        this.sfx.play('caught');
      }
    }
    this.chef.heat = hard
      ? 1.1 + p.cheeseFound.size * 0.2 + (p.escapeActive ? 0.3 : 0)
      : p.phase === 'cheese' ? (p.escapeActive ? 1.25 : 1) : 0;
    if (p.complete) {
      this.mode = 'won';
    } else if (this.mode === 'play' && this.chef.update(dt, r)) {
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
    // The actual V1/V2 1600×680 illustrated room is a parallax layer.
    // Preserve its proportions instead of stretching the furniture across V3.
    const wallWidth = Math.max((HEIGHT * 1600) / 680, w);
    if (this.wall.displayWidth !== wallWidth)
      this.wall.setDisplaySize(wallWidth, (wallWidth * 680) / 1600);
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
    this.guardMopArt
      .setVisible(this.playStyle === 'chaos')
      .setAlpha(this.pantry.mopDisabled > 0 ? 0.35 : 1)
      .setPosition(this.guardMop.x, FLOOR - Math.sin(this.guardMop.phase) * 2);
    this.ventArt.forEach((vent, i) => {
      const show = this.playStyle === 'chaos';
      vent.plate.setVisible(show);
      const state = this.steam.state(i);
      vent.warning.setVisible(show && state === 'warning');
      vent.hot.setVisible(show && state === 'hot');
    });
    this.mopArt
      .setVisible(this.pantry.phase === 'cheese')
      .setAlpha(this.pantry.mopDisabled > 0 ? 0.4 : 1)
      .setPosition(this.mop.x, FLOOR - Math.sin(this.mop.phase) * 2);
    this.gadgetArt.forEach((image, i) => {
      const g = gadgets[i];
      image.setVisible(
        this.pantry.phase === 'cheese' && !this.pantry.gadgetsUsed.has(g.id)
      );
    });
    this.cheeseArt.forEach((image, i) => {
      const cache = cheeseCaches[i];
      image
        .setVisible(
          this.pantry.phase === 'cheese' && !this.pantry.cheeseFound.has(cache.id)
        )
        .setY(cache.y - 5 - Math.sin(this.runTime * 4 + i * 2) * 3);
    });
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
      phase: p.phase,
      playStyle: this.playStyle,
      cheese: [...p.cheeseFound],
      pranks: [...p.gadgetsUsed],
      notebook: p.notebook.tasks.map((task) => ({ id: task.id, done: p.notebook.done.has(task.id) })),
      squeakCooldown: +p.squeakCooldown.toFixed(1),
      squeaks: p.squeaks,
      escapeActive: p.escapeActive,
      escapeLeft: +p.escapeLeft.toFixed(1),
      mopHits: p.mopHits,
      mopX: Math.round(this.mop.x),
      guardMopX: Math.round(this.guardMop.x),
      chefHeat: +c.heat.toFixed(2),
      steamHits: this.steam.hits,
      vents: STEAM_VENTS.map((vent, i) => ({x: vent.x, state: this.steam.state(i)})),
      mopDisabled: +p.mopDisabled.toFixed(1),
      chefBlinded: +c.blinded.toFixed(1),
      complete: p.complete,
      score: this.score().points,
      failureReason: this.failureReason,
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
  score() {
    const p = this.pantry;
    const points = Math.max(0, Math.round(
      p.delivered.size * 600 + p.cheeseFound.size * 350 +
      p.gadgetsUsed.size * 200 + p.notebook.completed * 260 +
      this.rat.energy * 2 + Math.max(0, 180 - this.runTime) * 6 +
      (p.complete ? p.escapeLeft * 7 : 0) -
      p.mopHits * 140 - this.steam.hits * 135 - p.squeaks * 20
    ));
    return {
      points,
      rank: points >= 4400 ? 'GOLD' : points >= 3700 ? 'SILVER' : 'BRONZE',
      duration: Math.round(this.runTime),
      challenges: p.notebook.completed,
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
