import Phaser from 'phaser';
import roomUrl from '../assets/room.png?url';
import ratUrl from '../assets/rat.png?url';
import chefUrl from '../assets/chef.png?url';
import cakeUrl from '../assets/cake.png?url';
import eclairUrl from '../assets/eclair.png?url';
import macaronUrl from '../assets/macaron.png?url';
import cheeseUrl from '../assets/cheese.png?url';
import {
  FOOD, FLOOR_Y, GOAL, ROOMS, WORLD_HEIGHT, WORLD_WIDTH,
  type ClimbSpot, type FoodKind, type RoomId,
} from './v2/levels';

type ChefMood = 'patrol' | 'investigate' | 'chase' | 'search';
type Action = 'none' | 'deliver' | 'home' | 'food' | 'door' | 'climb' | 'hide';

interface FoodObject {
  id: string;
  kind: FoodKind;
  image: Phaser.GameObjects.Image;
}

const virtual = { left: false, right: false, up: false, boost: false };
export function setVirtualControl(key: keyof typeof virtual, down: boolean): void { virtual[key] = down; }
export function releaseVirtualControls(): void {
  virtual.left = virtual.right = virtual.up = virtual.boost = false;
}
function event(name: string, detail?: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent('ratgame:' + name, { detail }));
}
function text(id: string, value: string): void {
  const node = document.getElementById(id);
  if (node && node.textContent !== value) node.textContent = value;
}
function bar(id: string, value: number): void {
  const node = document.getElementById(id);
  const next = Math.round(Phaser.Math.Clamp(value, 0, 100)) + '%';
  if (node && node.style.width !== next) node.style.width = next;
}

export class KitchenScene extends Phaser.Scene {
  private rat!: Phaser.Physics.Arcade.Sprite;
  private chef!: Phaser.GameObjects.Image;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keyboard!: Record<string, Phaser.Input.Keyboard.Key>;
  private decor: Phaser.GameObjects.GameObject[] = [];
  private food: FoodObject[] = [];
  private taken = new Set<string>();
  private room: RoomId = 'kitchen';
  private carrying: FoodKind | null = null;
  private carriedIcon: Phaser.GameObjects.Image | null = null;
  private energy = 60;
  private delivered = 0;
  private score = 0;
  private best = 0;
  private hiddenAt = '';
  private isStarted = false;
  private isFinished = false;
  private touch = false;
  private climb: ClimbSpot | null = null;
  private groundedAt = -10000;
  private note!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private noteTimer = 0;
  private hudTimer = 0;
  private chefMood: ChefMood = 'patrol';
  private chefFacing = 1;
  private lastSeen = 0;
  private suspicion = 0;
  private chaseTimer = 0;
  private searchTimer = 0;
  private clock = 0;
  private frameClock = 0;

  constructor() { super({ key: 'KitchenScene' }); }

  preload(): void {
    this.load.on('loaderror', (file: { key?: string }) => {
      event('fatal', { message: 'Failed to load ' + (file.key || 'game art') });
    });
    this.load.image('room', roomUrl);
    this.load.image('rat', ratUrl);
    this.load.image('chef', chefUrl);
    this.load.image('cake', cakeUrl);
    this.load.image('eclair', eclairUrl);
    this.load.image('macaron', macaronUrl);
    this.load.image('cheese', cheeseUrl);
  }

  create(): void {
    // Scene objects are reused by Phaser across replay; explicitly reset all state.
    this.touch = window.matchMedia('(pointer:coarse)').matches;
    this.taken.clear();
    this.room = 'kitchen';
    this.carrying = null;
    this.carriedIcon = null;
    this.energy = this.touch ? 70 : 55;
    this.delivered = 0;
    this.score = 0;
    this.hiddenAt = '';
    this.isStarted = false;
    this.isFinished = false;
    this.climb = null;
    this.groundedAt = -10000;
    this.hudTimer = 0;
    this.noteTimer = 0;
    this.chefMood = 'patrol';
    this.chefFacing = 1;
    this.lastSeen = 0;
    this.chaseTimer = 0;
    this.searchTimer = 0;
    this.suspicion = 0;
    this.clock = 0;
    this.frameClock = 0;
    this.decor = [];
    this.food = [];
    releaseVirtualControls();

    try {
      const saved = Number(localStorage.getItem('rat-game-v2-best'));
      this.best = Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch { this.best = 0; }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 1120;
    this.platforms = this.physics.add.staticGroup();
    this.rat = this.physics.add.sprite(1460, 540, 'rat').setScale(0.75);
    this.rat.setDepth(15).setCollideWorldBounds(true).setBounce(0);
    this.rat.setSize(66, 65).setOffset(29, 36);
    (this.rat.body as Phaser.Physics.Arcade.Body).setMaxVelocity(420, 850);
    this.physics.add.collider(this.rat, this.platforms);

    this.chef = this.add.image(235, 532, 'chef').setScale(0.68).setDepth(14);
    this.note = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '19px', fontStyle: 'bold',
      color: '#493844', backgroundColor: '#fff8e8',
      padding: { x: 10, y: 7 },
    }).setOrigin(0.5).setDepth(60).setVisible(false);
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', fontStyle: 'bold',
      color: '#613d56', backgroundColor: '#fff6e9',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(55).setVisible(false);

    this.enterRoom('kitchen', 1460);

    this.keyboard = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,E,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', this.onEscape, this);
    kb.on('keydown-E', this.onUse, this);
    kb.on('keydown-S', this.onHide, this);
    kb.on('keydown-DOWN', this.onHide, this);
    this.cameras.main.startFollow(this.rat, false, this.touch ? 0.17 : 0.10, this.touch ? 0.18 : 0.10);
    this.configureCamera();
    this.scale.on('resize', this.configureCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown-ESC', this.onEscape, this);
      kb.off('keydown-E', this.onUse, this);
      kb.off('keydown-S', this.onHide, this);
      kb.off('keydown-DOWN', this.onHide, this);
      this.scale.off('resize', this.configureCamera, this);
      releaseVirtualControls();
    });
    this.refreshHUD();
    event('ready');
  }

  private onEscape(): void { event('pause-request'); }
  private onUse(): void { this.virtualInteract(); }
  private onHide(): void { this.virtualHide(); }

  private configureCamera(): void {
    const w = Math.max(1, this.scale.width);
    const h = Math.max(1, this.scale.height);
    const portrait = this.touch && h > w;
    // Keep a readable rat on small screens. Camera follows rather than
    // shrinking the entire 1600px room into the phone viewport.
    const zoom = portrait ? Math.min(w / 480, h / 620) :
      this.touch ? Math.min(w / 990, h / 560) : Math.min(w / 1100, h / 680);
    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Clamp(zoom, 0.45, 1.65));
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setDeadzone(portrait ? 44 : 105, portrait ? 65 : 100);
  }

  startPlaying(): void {
    if (!this.isStarted) {
      this.isStarted = true;
      this.say('GO, LITTLE POTATO RAT! 🧀');
    }
  }
  virtualInteract(): void { if (this.isStarted && !this.isFinished) this.interact(); }
  virtualHide(): void {
    if (!this.isStarted || this.isFinished) return;
    this.toggleHide();
  }
  virtualJump(): void { if (this.isStarted && !this.isFinished) this.jump(); }
  virtualClimb(): void { if (this.isStarted && !this.isFinished) this.startClimb(); }

  private addSurface(x: number, y: number, width: number, height: number): void {
    const shape = this.add.rectangle(x, y, width, height, 0xffffff, 0);
    this.physics.add.existing(shape, true);
    const body = shape.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    body.checkCollision.down = false;
    body.updateFromGameObject();
    this.platforms.add(shape);
  }

  private drawPantry(): void {
    // One static Graphics object for the entire pantry. No per-frame drawing.
    const g = this.add.graphics().setDepth(-11);
    const wall = 0xffe2d7;
    g.fillStyle(wall, 1); g.fillRect(0, 0, 1600, 680);
    g.fillStyle(0xf7cdd5, 1); g.fillRect(0, 0, 1600, 75);
    g.fillStyle(0xb88169, 1); g.fillRect(0, 76, 1600, 11);
    for (let y = 115; y < 550; y += 73) {
      for (let x = (Math.floor(y / 73) % 2) * 42; x < 1600; x += 125) {
        g.lineStyle(2, 0xe9b9ac, 0.75);
        g.strokeRoundedRect(x, y, 116, 66, 3);
      }
    }
    g.fillStyle(0xf0c89a, 1); g.fillRect(0, 584, 1600, 96);
    g.lineStyle(3, 0xd8a579, 1);
    for (let x = 0; x < 1600; x += 74) g.lineBetween(x, 584, x, 680);
    for (let y = 608; y <= 680; y += 28) g.lineBetween(0, y, 1600, y);
    const shelves = [
      { x: 120, y: 406, w: 405 },
      { x: 655, y: 339, w: 394 },
      { x: 1150, y: 441, w: 305 },
    ];
    for (const s of shelves) {
      g.fillStyle(0x9d6546, 1); g.fillRoundedRect(s.x, s.y, s.w, 25, 7);
      g.fillStyle(0x734d3d, 1);
      g.fillRoundedRect(s.x + 20, s.y + 23, 17, 180, 3);
      g.fillRoundedRect(s.x + s.w - 38, s.y + 23, 17, 180, 3);
    }
    // Crooked jars and pastel tins on display.
    const colors = [0x9acdb6, 0xb9c6ed, 0xf1b6c8, 0xf6d38a, 0xb8d8dc];
    for (let i = 0; i < 21; i++) {
      const shelf = shelves[i % 3];
      const col = Math.floor(i / 3) % 7;
      const x = shelf.x + 44 + col * Math.min(52, (shelf.w - 95) / 7);
      const y = shelf.y - 48 - (i % 2) * 7;
      g.fillStyle(colors[i % colors.length], 1);
      g.fillRoundedRect(x, y, 32, 45, 7);
      g.fillStyle(0xfff7e7, 1); g.fillRoundedRect(x + 7, y + 14, 18, 13, 4);
      g.fillStyle(0x876071, 1); g.fillRoundedRect(x - 2, y - 5, 36, 8, 2);
    }
    g.fillStyle(0x806077, 1); g.fillRoundedRect(0, 428, 80, 176, 12);
    g.fillStyle(0xffe5a4, 1); g.fillRoundedRect(11, 453, 53, 90, 7);
    g.fillStyle(0x806077, 1); g.fillRoundedRect(1500, 429, 100, 175, 12);
    g.fillStyle(0xffe5a4, 1); g.fillRoundedRect(1518, 456, 63, 89, 7);
    this.decor.push(g);
    const sign = this.add.text(680, 128, 'PANTRY OF FORBIDDEN SNACKS', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '30px',
      fontStyle: 'bold', color: '#8b547a', backgroundColor: '#fff2d2',
      padding: { x: 22, y: 9 },
    }).setDepth(-9);
    this.decor.push(sign);
  }

  private enterRoom(id: RoomId, spawnX: number): void {
    for (const item of this.food) item.image.destroy();
    this.food = [];
    for (const item of this.decor) item.destroy();
    this.decor = [];
    this.platforms.clear(true, true);
    this.room = id;
    this.climb = null;
    this.hiddenAt = '';
    this.rat.setAlpha(1).setVisible(true);
    this.rat.setVelocity(0, 0).setPosition(spawnX, 530);
    (this.rat.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    const level = ROOMS[id];
    if (id === 'kitchen') {
      this.decor.push(this.add.image(0, 0, 'room').setOrigin(0, 0).setDepth(-11));
    } else {
      this.drawPantry();
    }
    for (const p of level.platforms) this.addSurface(p.x, p.y, p.width, p.height);
    for (const item of level.foods) {
      if (this.taken.has(item.id)) continue;
      const image = this.add.image(item.x, item.y, item.kind).setDepth(7).setScale(0.85);
      this.food.push({ id: item.id, kind: item.kind, image });
    }
    this.chef.setPosition(level.chefStartX, 532);
    this.chef.clearTint();
    this.chefMood = 'patrol';
    this.chefFacing = 1;
    this.suspicion = 0;
    this.searchTimer = 0;
    this.chaseTimer = 0;
    text('room-label', level.title);
    this.say(level.title.toUpperCase() + ' · BE VERY NORMAL.');
    this.refreshHUD();
  }

  update(time: number, delta: number): void {
    if (!this.isStarted || this.isFinished) return;
    const dt = Math.min(delta / 1000, 0.04);
    this.frameClock += dt;
    this.clock += dt;
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) this.groundedAt = time;
    if (this.noteTimer > 0) {
      this.noteTimer -= dt;
      this.note.setPosition(this.rat.x, this.rat.y - 87);
      if (this.noteTimer <= 0) this.note.setVisible(false);
    }
    if (!this.hiddenAt) this.moveRat(dt);
    else this.rat.setVelocity(0, 0);
    this.updateChef(dt);
    if (this.carriedIcon) {
      this.carriedIcon.setPosition(this.rat.x, this.rat.y - 62);
    }
    if (this.touch && this.carrying && this.room === 'kitchen' &&
        Math.abs(this.rat.x - ROOMS.kitchen.homeX!) < 90 && this.rat.y > 475) {
      this.deliver();
    }
    this.hudTimer += delta;
    if (this.hudTimer >= 100) {
      this.hudTimer = 0;
      this.showPrompt();
      this.refreshHUD();
    }
  }

  private moveRat(dt: number): void {
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    const left = this.keyboard.A.isDown || this.keyboard.LEFT.isDown || virtual.left;
    const right = this.keyboard.D.isDown || this.keyboard.RIGHT.isDown || virtual.right;
    const up = this.keyboard.W.isDown || this.keyboard.UP.isDown || virtual.up;
    const direction = Number(right) - Number(left);
    if (this.climb) {
      const target = this.climb;
      const gap = target.x - this.rat.x;
      body.setAllowGravity(false);
      if (Math.abs(gap) > 5) {
        this.rat.setVelocity(Math.sign(gap) * Math.min(260, Math.abs(gap) / Math.max(dt, 0.015)), 0);
      } else {
        this.rat.setX(target.x);
        this.rat.setVelocity(0, -255);
        if (this.rat.y <= target.top - 46) {
          this.climb = null;
          body.setAllowGravity(true);
          this.rat.setVelocityY(-95);
        }
      }
      return;
    }
    if (up) this.startClimb();
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE)) this.jump();
    const boosting = (this.keyboard.SHIFT.isDown || virtual.boost) && this.energy > 0 && direction !== 0;
    const baseSpeed = this.touch ? 228 : 210;
    let speed = boosting ? baseSpeed * 1.72 : baseSpeed;
    if (this.carrying) speed *= 0.82;
    if (boosting) this.energy = Math.max(0, this.energy - 32 * dt);
    body.setAllowGravity(true);
    const wanted = direction * speed;
    const responsiveness = Math.min(1, dt * (direction ? 17 : 23));
    this.rat.setVelocityX(Phaser.Math.Linear(body.velocity.x, wanted, responsiveness));
    if (direction) this.rat.setFlipX(direction < 0);
  }

  private jump(): void {
    if (this.hiddenAt) return;
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    if (this.climb) {
      this.climb = null;
      body.setAllowGravity(true);
    }
    const grounded = body.blocked.down || body.touching.down || this.time.now - this.groundedAt < 120;
    if (!grounded) return;
    this.groundedAt = -10000;
    this.rat.setVelocityY(-515);
  }

  private nearbyClimb(): ClimbSpot | null {
    const level = ROOMS[this.room];
    let best: ClimbSpot | null = null;
    let bestDist = 99999;
    for (const zone of level.climbs) {
      const d = Math.abs(this.rat.x - zone.x);
      if (d < (this.touch ? 136 : 68) && d < bestDist &&
          this.rat.y > zone.top - 72 && this.rat.y < zone.bottom + 23) {
        best = zone;
        bestDist = d;
      }
    }
    return best;
  }
  private startClimb(): void {
    if (this.hiddenAt || this.climb) return;
    const zone = this.nearbyClimb();
    if (zone) this.climb = zone;
    else if (this.touch) this.say('GO NEAR A TABLE LEG FIRST!');
  }

  private nearestFood(): FoodObject | null {
    let nearest: FoodObject | null = null;
    let best = Infinity;
    for (const item of this.food) {
      const dx = item.image.x - this.rat.x;
      const dy = item.image.y - this.rat.y;
      const sq = dx * dx + dy * dy;
      if (sq < best) { nearest = item; best = sq; }
    }
    return nearest;
  }
  private nearbyFood(): FoodObject | null {
    const item = this.nearestFood();
    if (!item) return null;
    const range = this.touch ? 128 : 90;
    return Phaser.Math.Distance.Between(this.rat.x, this.rat.y, item.image.x, item.image.y) <= range ? item : null;
  }
  private nearbyHide(): string | null {
    if (this.rat.y < 470) return null;
    const spot = ROOMS[this.room].hides.find(z => Math.abs(z.x - this.rat.x) < z.radius);
    return spot?.name || null;
  }
  private nearDoor(): boolean {
    return Math.abs(this.rat.x - ROOMS[this.room].exitX) < 92 && this.rat.y > 490;
  }
  private nearHome(): boolean {
    return this.room === 'kitchen' && this.rat.y > 475 &&
      Math.abs(this.rat.x - ROOMS.kitchen.homeX!) < 103;
  }
  private action(): Action {
    if (this.hiddenAt) return 'hide';
    if (this.nearHome()) return this.carrying ? 'deliver' : 'home';
    if (this.nearbyFood()) return 'food';
    if (this.nearDoor()) return 'door';
    if (this.nearbyClimb() && this.rat.y > 425) return 'climb';
    if (this.nearbyHide()) return 'hide';
    return 'none';
  }

  private interact(): void {
    const action = this.action();
    if (action === 'deliver') { this.deliver(); return; }
    if (action === 'home' || action === 'hide') { this.toggleHide(); return; }
    if (action === 'door') {
      const level = ROOMS[this.room];
      this.enterRoom(level.exitTo, level.exitSpawnX);
      return;
    }
    if (action === 'climb') { this.startClimb(); return; }
    if (action === 'food') {
      const item = this.nearbyFood();
      if (!item) return;
      if (this.carrying) { this.say('ONE SNACK AT A TIME, GREEDY RAT!'); return; }
      this.taken.add(item.id);
      this.food.splice(this.food.indexOf(item), 1);
      item.image.destroy();
      if (this.energy >= 99.9) {
        this.carrying = item.kind;
        this.carriedIcon?.destroy();
        this.carriedIcon = this.add.image(this.rat.x, this.rat.y - 62, item.kind)
          .setScale(0.63).setDepth(22);
        this.say('STOLEN! BACK TO YOUR HOLE!');
      } else {
        const gain = FOOD[item.kind].energy;
        this.energy = Math.min(100, this.energy + gain);
        this.say('CHOMP CHOMP! +' + gain + ' ENERGY');
      }
      this.refreshHUD();
      return;
    }
    this.say('NOTHING TO STEAL HERE. RUDE.');
  }

  private deliver(): void {
    if (!this.carrying) return;
    this.delivered += 1;
    this.score += FOOD[this.carrying].points;
    this.carrying = null;
    this.carriedIcon?.destroy();
    this.carriedIcon = null;
    this.say('FOOD SECURED! ' + this.delivered + '/' + GOAL);
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem('rat-game-v2-best', String(this.best)); } catch { /* privacy mode */ }
    }
    if (this.delivered >= GOAL) this.finish(true);
    else this.refreshHUD();
  }

  private toggleHide(): void {
    if (this.hiddenAt) {
      this.hiddenAt = '';
      this.rat.setAlpha(1);
      (this.rat.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      this.say('BACK TO RAT CRIMES!');
      return;
    }
    const spot = this.nearbyHide();
    if (!spot) { this.say('NO HIDING PLACE HERE!'); return; }
    this.climb = null;
    this.hiddenAt = spot;
    this.rat.setVelocity(0, 0).setAlpha(spot === 'your rat hole' ? 0.18 : 0.35);
    (this.rat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.say('HIDDEN IN ' + spot.toUpperCase());
  }

  private updateChef(dt: number): void {
    const level = ROOMS[this.room];
    const dx = this.rat.x - this.chef.x;
    const distance = Math.abs(dx);
    const sight = this.touch ? 200 : 245;
    const canSee = !this.hiddenAt && this.rat.y > 449 && distance < sight;
    const oldMood = this.chefMood;
    if (canSee) {
      this.suspicion = Math.min(100, this.suspicion + dt * 270);
      this.lastSeen = this.rat.x;
      this.chaseTimer = 1.7;
      if (this.suspicion >= 45) this.chefMood = 'chase';
      else this.chefMood = 'investigate';
    } else if (this.chefMood === 'chase') {
      this.chaseTimer -= dt;
      if (this.chaseTimer <= 0) { this.chefMood = 'search'; this.searchTimer = 2.2; }
    } else if (this.chefMood === 'search' || this.chefMood === 'investigate') {
      this.searchTimer -= dt;
      this.suspicion = Math.max(0, this.suspicion - dt * 17);
      if (this.searchTimer <= 0) this.chefMood = 'patrol';
    } else this.suspicion = Math.max(0, this.suspicion - dt * 28);

    let destination = this.chef.x;
    let speed = 0;
    if (this.chefMood === 'chase') {
      destination = this.lastSeen;
      speed = this.touch ? 149 : 212;
    } else if (this.chefMood === 'search' || this.chefMood === 'investigate') {
      destination = this.lastSeen;
      speed = 85;
    } else {
      destination = (level.patrolMin + level.patrolMax) / 2 +
        Math.sin(this.clock * 0.45) * (level.patrolMax - level.patrolMin) / 2;
      speed = 82;
    }
    const deltaX = destination - this.chef.x;
    if (Math.abs(deltaX) > 7) {
      const motion = Math.sign(deltaX) * Math.min(Math.abs(deltaX), speed * dt);
      this.chef.setX(Phaser.Math.Clamp(this.chef.x + motion, 58, 1542));
      this.chefFacing = Math.sign(motion);
    }
    this.chef.setFlipX(this.chefFacing < 0);
    if (this.chefMood !== oldMood) {
      this.chef.setTint(this.chefMood === 'chase' ? 0xffaeb4 : 0xffffff);
      if (this.chefMood === 'chase') this.say('MON DIEU! THE RAT!');
    }
    if (this.chefMood === 'chase' && !this.hiddenAt && distance < (this.touch ? 46 : 58) &&
        this.rat.y > 488) this.finish(false);
  }

  private showPrompt(): void {
    if (this.hiddenAt || this.isFinished) { this.prompt.setVisible(false); return; }
    const action = this.action();
    let label = '';
    switch (action) {
      case 'deliver': label = 'E / ACTION · DELIVER'; break;
      case 'home': label = 'E / ACTION · HIDE AT HOME'; break;
      case 'food': label = this.carrying ? 'TAKE IT HOME!' :
        this.energy >= 99.9 ? 'E / ACTION · STEAL' : 'E / ACTION · EAT'; break;
      case 'door': label = 'E / ACTION · ' + ROOMS[this.room].exitLabel; break;
      case 'climb': label = 'E / ACTION · CLIMB'; break;
      case 'hide': label = 'E / ACTION · HIDE'; break;
    }
    if (label) this.prompt.setText(label).setPosition(this.rat.x, this.rat.y - 115);
    this.prompt.setVisible(!!label);
  }

  private refreshHUD(): void {
    text('energy-label', Math.ceil(this.energy) + '%');
    text('carrying-label', this.carrying ? FOOD[this.carrying].label : 'Nothing');
    text('delivered-label', this.delivered + '/' + GOAL);
    text('room-label', ROOMS[this.room].title);
    text('score-label', String(this.score));
    text('best-label', String(this.best));
    text('status-label', this.hiddenAt ? 'HIDDEN · ' + this.hiddenAt.toUpperCase() :
      this.chefMood === 'chase' ? 'CHEF IS CHASING!' :
      this.chefMood === 'search' ? 'CHEF IS SEARCHING...' :
      this.carrying ? 'GET THE FOOD HOME!' : 'STEAL SOME PASTRIES!');
    bar('energy-fill', this.energy);
    bar('suspicion-fill', this.suspicion);
    const action = this.action();
    const labels: Record<Action, string> = {
      none: 'ACTION', deliver: 'DELIVER', home: 'HIDE', food: this.carrying ? 'CARRYING' :
        this.energy >= 99.9 ? 'STEAL' : 'EAT',
      door: 'DOOR', climb: 'CLIMB', hide: this.hiddenAt ? 'UNHIDE' : 'HIDE',
    };
    text('touch-interact-label', labels[action]);
    text('touch-hide-label', this.hiddenAt ? 'UNHIDE' : 'HIDE');
  }

  private say(message: string): void {
    if (!this.note) return;
    this.note.setText(message).setPosition(this.rat.x, this.rat.y - 87).setVisible(true);
    this.noteTimer = 1.6;
  }

  private finish(won: boolean): void {
    if (this.isFinished) return;
    this.isFinished = true;
    releaseVirtualControls();
    this.rat.setVelocity(0, 0);
    this.prompt.setVisible(false);
    if (!won) {
      // Actual visual game-over beat: the rat becomes a very suspicious dessert.
      this.rat.setVisible(false);
      const ratCake = this.add.image(this.rat.x, this.rat.y, 'cake')
        .setScale(1.4).setDepth(40);
      this.tweens.add({ targets: ratCake, scale: 1.8, duration: 550, ease: 'Back.Out' });
    }
    this.time.delayedCall(won ? 500 : 850, () => {
      event('dialog', won ? {
        mode: 'won', icon: '🏆', kicker: 'A MASTERCLASS IN RAT CRIME',
        title: 'THE ROUND ONE WINS!',
        description: 'You delivered ' + GOAL + ' snacks for ' + this.score +
          ' points. The French chef may never emotionally recover.',
        button: 'STEAL AGAIN',
      } : {
        mode: 'lost', icon: '🍰', kicker: 'MON DIEU!',
        title: 'YOU ARE NOW RAT CAKE.',
        description: 'The chef turned one extremely round criminal into a suspiciously fluffy dessert.',
        button: 'ONE MORE RAT?',
      });
    });
  }
}
