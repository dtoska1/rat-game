import Phaser from 'phaser';

const W = 1600, H = 700, FLOOR = 606, GOAL = 3;
type SnackType = 'cake' | 'eclair' | 'macaron' | 'cheese';
type ChefState = 'patrol' | 'suspicious' | 'chase' | 'search';
interface Snack {
  kind: SnackType; value: number; name: string;
  x: number; y: number; image?: Phaser.GameObjects.Image; eaten?: boolean;
}
interface HideSpot { x: number; radius: number; label: string }
interface ClimbSpot { x: number; top: number; dropX: number }

const SNACKS: Snack[] = [
  { kind: 'cake', name: 'strawberry cake', value: 40, x: 312, y: 317 },
  { kind: 'eclair', name: 'éclair', value: 28, x: 426, y: 321 },
  { kind: 'macaron', name: 'macaron', value: 20, x: 532, y: 319 },
  { kind: 'eclair', name: 'éclair', value: 28, x: 637, y: 320 },
  { kind: 'cake', name: 'strawberry cake', value: 40, x: 745, y: 316 },
  { kind: 'cheese', name: 'cheese', value: 15, x: 945, y: 295 },
  { kind: 'macaron', name: 'macaron', value: 20, x: 1055, y: 294 },
  { kind: 'cheese', name: 'cheese', value: 15, x: 1117, y: 514 },
  { kind: 'eclair', name: 'éclair', value: 28, x: 1254, y: 522 },
  { kind: 'macaron', name: 'macaron', value: 20, x: 1394, y: 520 },
];
const HIDES: HideSpot[] = [
  { x: 136, radius: 92, label: 'the rat hole' },
  { x: 535, radius: 240, label: 'under the table' },
  { x: 980, radius: 98, label: 'the cupboard' },
  { x: 1300, radius: 84, label: 'behind the fridge' },
];
const CLIMBS: ClimbSpot[] = [
  { x: 258, top: 347, dropX: 338 },
  { x: 808, top: 347, dropX: 743 },
  { x: 918, top: 308, dropX: 982 },
  { x: 1130, top: 308, dropX: 1074 },
];

const held = { left: false, right: false, boost: false };
export function setVirtualControl(key: keyof typeof held, value: boolean): void {
  held[key] = value;
}
export function releaseVirtualControls(): void {
  held.left = held.right = held.boost = false;
}
function emit(name: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent('ratgame:' + name, { detail }));
}

export class KitchenScene extends Phaser.Scene {
  private rat!: Phaser.Physics.Arcade.Sprite;
  private chef!: Phaser.GameObjects.Image;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private snacks: Snack[] = [];
  private foodHeld: SnackType | null = null;
  private foodGraphic: Phaser.GameObjects.Image | null = null;
  private notice!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private energy = 62;
  private collected = 0;
  private score = 0;
  private hidden = false;
  private hidingPlace = '';
  private playing = false;
  private ended = false;
  private climbing = false;
  private climbTween: Phaser.Tweens.Tween | null = null;
  private climbingCooldown = 0;
  private chefState: ChefState = 'patrol';
  private chefFacing = -1;
  private chefAlert = 0;
  private chefLastSeen = 900;
  private chefSearching = 0;
  private chefStunned = 0;
  private floorTime = -1e9;
  private jumpQueued = -1e9;
  private timeElapsed = 0;
  private statusClock = 0;
  private messageUntil = 0;
  private jumpWasDown = false;
  private mobile = false;

  constructor() { super({ key: 'KitchenScene' }); }

  preload(): void {
    const root = import.meta.env.BASE_URL + 'vs-art/';
    this.load.svg('kitchen-vs', root + 'kitchen.svg', { width: 1600, height: 700 });
    this.load.svg('rat-vs', root + 'rat.svg', { width: 270, height: 240 });
    this.load.svg('chef-vs', root + 'chef.svg', { width: 250, height: 295 });
    for (const kind of ['cake', 'eclair', 'macaron', 'cheese'] as const) {
      this.load.svg('snack-' + kind, root + kind + '.svg');
    }
    this.load.on('loaderror', (file: { key?: string; url?: string }) => {
      emit('fatal', { message: 'Could not load ' + (file.key || file.url || 'artwork') });
    });
  }

  create(): void {
    this.reset();
    this.mobile = matchMedia('(pointer:coarse)').matches;
    // Extend the painted room so the camera can center the rat near HOME.
    const extension = this.add.graphics().setDepth(-60);
    extension.fillStyle(0xf6daca).fillRect(-225, 0, 2050, 560);
    extension.fillStyle(0xe5b691).fillRect(-225, 559, 2050, 141);
    extension.lineStyle(2, 0xd9ae9e, .5);
    for (let y = 111; y < 550; y += 74) {
      extension.lineBetween(-225, y, 0, y);
      extension.lineBetween(1600, y, 1825, y);
    }
    extension.fillStyle(0xd8a87d, .2).fillEllipse(-110, 615, 160, 18);
    this.add.image(0, 0, 'kitchen-vs').setOrigin(0, 0).setDepth(-50);
    this.physics.world.gravity.y = 1280;
    this.physics.world.setBounds(30, 10, 1540, 625);
    this.platforms = this.physics.add.staticGroup();
    this.surface(800, FLOOR + 25, 1600, 50);
    this.surface(536, 351, 606, 18);
    this.surface(980, 308, 220, 12);
    this.surface(1070, 528, 140, 14);

    this.rat = this.physics.add.sprite(164, 563, 'rat-vs').setScale(0.47);
    this.rat.setDepth(20).setBounce(0).setCollideWorldBounds(true);
    this.rat.setSize(126, 129).setOffset(72, 84);
    (this.rat.body as Phaser.Physics.Arcade.Body).setMaxVelocity(445, 880);
    this.physics.add.collider(this.rat, this.platforms);

    this.chef = this.add.image(1350, 521, 'chef-vs').setScale(0.62).setDepth(18);
    this.chef.setFlipX(true);
    this.snacks = SNACKS.map(s => ({
      ...s, eaten: false,
      image: this.add.image(s.x, s.y, 'snack-' + s.kind).setScale(0.58).setDepth(15),
    }));

    this.notice = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontStyle: 'bold', fontSize: '21px',
      color: '#6a4652', backgroundColor: '#fffae6',
      padding: { x: 12, y: 7 },
    }).setOrigin(.5).setDepth(90).setVisible(false);

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px',
      fontStyle: 'bold', color: '#714e61', backgroundColor: '#fdf6e5',
      padding: { x: 8, y: 5 },
    }).setOrigin(.5).setDepth(80).setVisible(false);

    this.keys = this.input.keyboard!.addKeys('A,D,LEFT,RIGHT,W,UP,SPACE,SHIFT,E,F,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    const kb = this.input.keyboard!;
    kb.on('keydown-E', this.onInteract, this);
    kb.on('keydown-F', this.onInteract, this);
    kb.on('keydown-ESC', this.onPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown-E', this.onInteract, this);
      kb.off('keydown-F', this.onInteract, this);
      kb.off('keydown-ESC', this.onPause, this);
      this.scale.off('resize', this.adjustCamera, this);
      releaseVirtualControls();
    });

    this.cameras.main.startFollow(this.rat, false, .16, .12);
    this.adjustCamera();
    this.scale.on('resize', this.adjustCamera, this);
    this.updateHud();
    emit('ready');
  }

  private onInteract(): void { this.virtualInteract(); }
  private onPause(): void { emit('pause-request'); }
  private reset(): void {
    this.snacks = []; this.foodHeld = null; this.foodGraphic = null;
    this.energy = 62; this.collected = 0; this.score = 0;
    this.hidden = false; this.hidingPlace = ''; this.playing = false;
    this.ended = false; this.climbing = false; this.climbTween = null; this.climbingCooldown = 0;
    this.chefState = 'patrol'; this.chefFacing = -1; this.chefAlert = 0;
    this.chefLastSeen = 900; this.chefSearching = 0; this.chefStunned = 0;
    this.floorTime = -1e9; this.jumpQueued = -1e9; this.timeElapsed = 0;
    this.statusClock = 0; this.messageUntil = 0; this.jumpWasDown = false;
    releaseVirtualControls();
  }

  private surface(x: number, y: number, w: number, h: number): void {
    const rectangle = this.add.rectangle(x, y, w, h, 0xffffff, 0);
    this.physics.add.existing(rectangle, true);
    const body = rectangle.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    body.checkCollision.down = false;
    body.updateFromGameObject();
    this.platforms.add(rectangle);
  }

  private adjustCamera(): void {
    const w = Math.max(1, this.scale.width), h = Math.max(1, this.scale.height);
    const coarse = matchMedia('(pointer:coarse)').matches;
    const zoom = coarse && h > w ? Math.min(w / 485, h / 650)
      : coarse ? Math.min(w / 1060, h / 575)
      : Math.min(w / 1180, h / 655);
    this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, .39, 1.45));
    this.cameras.main.setBounds(-225, 0, W + 450, H);
    this.cameras.main.setDeadzone(coarse ? 40 : 150, coarse ? 85 : 120);
    this.cameras.main.roundPixels = true;
  }

  startPlaying(): void {
    if (!this.playing) { this.playing = true; this.say('GO STEAL SOMETHING, POTATO RAT!'); }
  }
  virtualJump(): void {
    if (!this.playing || this.ended || this.hidden) return;
    // A jump must work even if a table-climb animation has already begun.
    if (this.climbing) {
      this.climbTween?.stop();
      this.climbTween = null;
      this.climbing = false;
      this.climbingCooldown = .45;
      (this.rat.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      this.rat.setAngle(0).setScale(.47).setVelocityY(-390);
      emit('sound', { kind: 'jump' });
    } else this.jumpQueued = this.time.now;
  }
  virtualInteract(): void {
    if (!this.playing || this.ended) return;
    this.interact();
  }
  virtualHide(): void { this.virtualInteract(); }
  virtualClimb(): void { this.virtualInteract(); }

  private grounded(): boolean {
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }
  private jump(): void {
    if (this.ended || this.climbing || this.hidden) return;
    if (!(this.grounded() || this.time.now - this.floorTime < 125)) return;
    this.jumpQueued = -1e9;
    this.floorTime = -1e9;
    this.rat.setVelocityY(-565);
    this.rat.setScale(.48, .45).setAngle(-7);
    emit('sound', { kind: 'jump' });
  }

  private move(dt: number): void {
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    if (this.climbing) return;
    const left = this.keys.A.isDown || this.keys.LEFT.isDown || held.left;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown || held.right;
    const input = Number(right) - Number(left);
    const running = (held.boost || this.keys.SHIFT.isDown) && this.energy > 1 && input !== 0;
    const targetSpeed = input * (running ? 360 : 215) * (this.foodHeld ? .84 : 1);
    if (running) this.energy = Math.max(0, this.energy - 29 * dt);
    const now = body.velocity.x;
    const change = (input ? 2200 : 2700) * dt;
    this.rat.setVelocityX(Phaser.Math.Clamp(targetSpeed, now - change, now + change));
    if (input) this.rat.setFlipX(input < 0);

    const jumpDown = this.keys.SPACE.isDown || this.keys.W.isDown || this.keys.UP.isDown;
    if (jumpDown && !this.jumpWasDown) this.jumpQueued = this.time.now;
    this.jumpWasDown = jumpDown;
    if (this.time.now - this.jumpQueued < 160) this.jump();

    // Moving toward a table leg automatically scrambles the rat onto furniture.
    if (!this.grounded() || this.climbingCooldown > 0 || !input) return;
    for (const zone of CLIMBS) {
      const distance = Math.abs(this.rat.x - zone.x);
      const facingIntoLeg = Math.sign(zone.dropX - zone.x) === input;
      if (distance < 25 && this.rat.y > zone.top + 100 && facingIntoLeg) {
        this.climbTo(zone); return;
      }
    }
  }

  private climbTo(zone: ClimbSpot): void {
    if (this.climbing || this.hidden || this.ended) return;
    this.climbing = true;
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.rat.setVelocity(0, 0);
    const startX = this.rat.x, startY = this.rat.y;
    this.climbTween = this.tweens.addCounter({
      from: 0, to: 1, duration: 440, ease: 'Sine.easeInOut',
      onUpdate: tween => {
        const t = tween.getValue() || 0;
        this.rat.setPosition(
          Phaser.Math.Linear(startX, zone.dropX, t),
          Phaser.Math.Linear(startY, zone.top - 64, t) - Math.sin(t * Math.PI) * 25,
        );
        this.rat.setAngle(Math.sin(t * Math.PI * 2) * 12);
      },
      onComplete: () => {
        this.climbTween = null;
        this.rat.setAngle(0).setScale(.47);
        body.setAllowGravity(true);
        this.rat.setVelocity(0, 0);
        this.climbing = false;
        this.climbingCooldown = .65;
      },
    });
    emit('sound', { kind: 'climb' });
  }

  private nearestFood(): Snack | undefined {
    let nearest: Snack | undefined, distSq = Infinity;
    for (const snack of this.snacks) {
      if (snack.eaten) continue;
      const dx = snack.x - this.rat.x, dy = snack.y - this.rat.y;
      const d = dx * dx + dy * dy;
      if (d < distSq) { nearest = snack; distSq = d; }
    }
    if (nearest && distSq < (this.mobile ? 140 : 105) ** 2) return nearest;
    return undefined;
  }
  private hideSpot(): HideSpot | undefined {
    if (this.rat.y < 493) return undefined;
    return HIDES.find(x => Math.abs(x.x - this.rat.x) <= x.radius);
  }
  private nearHole(): boolean {
    return this.rat.y > 495 && Math.abs(this.rat.x - 135) < 92;
  }

  private interact(): void {
    if (this.hidden) {
      this.hidden = false; this.hidingPlace = ''; this.rat.setAlpha(1);
      this.say('THE RAT HAS RETURNED TO CRIME'); emit('sound', { kind: 'pop' }); return;
    }
    if (this.nearHole() && this.foodHeld) {
      const carried = this.foodHeld;
      this.foodHeld = null; this.foodGraphic?.destroy(); this.foodGraphic = null;
      this.collected++; this.score += 100 + (carried === 'cake' ? 40 : 0);
      this.energy = Math.min(100, this.energy + 14);
      this.say('DELIVERED! THE HOLE IS RICH! 🧀');
      emit('sound', { kind: 'win' });
      if (this.collected >= GOAL) this.finish(true);
      this.updateHud();
      return;
    }
    const snack = this.nearestFood();
    if (snack && !this.foodHeld) {
      snack.eaten = true;
      snack.image?.destroy();
      if (this.energy >= 99.9) {
        this.foodHeld = snack.kind;
        this.foodGraphic = this.add.image(this.rat.x, this.rat.y - 70, 'snack-' + snack.kind)
          .setScale(.52).setDepth(24);
        this.say('STOLEN! RETURN TO THE HOLE!');
        emit('sound', { kind: 'steal' });
      } else {
        this.energy = Math.min(100, this.energy + snack.value);
        this.say('NOM! +' + snack.value + ' ENERGY');
        this.rat.setScale(.52, .42);
        emit('sound', { kind: 'eat' });
      }
      this.updateHud(); return;
    }
    if (this.nearHole() || this.hideSpot()) {
      const place = this.nearHole() ? 'the rat hole' : this.hideSpot()!.label;
      this.hidden = true; this.hidingPlace = place;
      this.rat.setVelocity(0, 0).setAlpha(place === 'the rat hole' ? .24 : .44);
      this.say('INVISIBLE. PROBABLY.');
      emit('sound', { kind: 'hide' });
      this.updateHud(); return;
    }
    if (this.climbingCooldown <= 0) {
      const near = CLIMBS.find(z => Math.abs(this.rat.x - z.x) < 90 && this.rat.y > z.top + 75);
      if (near) { this.climbTo(near); return; }
    }
    this.say(this.foodHeld ? 'TAKE THE SNACK HOME!' : 'GET CLOSE TO SOMETHING!');
  }

  private updateChef(dt: number): void {
    const dx = this.rat.x - this.chef.x, distance = Math.abs(dx);
    const chefFacingRat = Math.sign(dx) === this.chefFacing;
    const visible = !this.hidden && this.rat.y > 465 && distance < 350
      && (chefFacingRat || distance < 120) && this.chefStunned <= 0;
    const wasState = this.chefState;
    if (visible) {
      this.chefLastSeen = this.rat.x;
      this.chefAlert = Math.min(100, this.chefAlert + dt * 145);
      if (this.chefAlert > 54) this.chefState = 'chase';
      else this.chefState = 'suspicious';
      this.chefSearching = 1.9;
    } else if (this.chefState === 'chase' || this.chefState === 'suspicious') {
      this.chefSearching -= dt;
      if (this.chefSearching < 0) {
        this.chefState = 'search'; this.chefSearching = 2.2;
      }
    } else if (this.chefState === 'search') {
      this.chefSearching -= dt;
      this.chefAlert = Math.max(0, this.chefAlert - 30 * dt);
      if (this.chefSearching < 0) this.chefState = 'patrol';
    } else this.chefAlert = Math.max(0, this.chefAlert - 24 * dt);
    if (this.chefStunned > 0) this.chefStunned -= dt;

    let target = 0, speed = 0;
    if (this.chefState === 'patrol') {
      target = 1160 + Math.sin(this.timeElapsed * .55) * 290;
      speed = 95;
    } else {
      target = this.chefLastSeen;
      speed = this.chefState === 'chase' ? (this.mobile ? 188 : 220) : 110;
    }
    if (this.chefStunned > 0) speed = 0;
    const travel = Phaser.Math.Clamp(target - this.chef.x, -speed * dt, speed * dt);
    this.chef.x = Phaser.Math.Clamp(this.chef.x + travel, 670, 1510);
    if (Math.abs(travel) > .05) this.chefFacing = Math.sign(travel);
    this.chef.setFlipX(this.chefFacing === -1);
    if (wasState !== this.chefState) {
      this.chef.setTint(this.chefState === 'chase' ? 0xffbbbb : 0xffffff);
      if (this.chefState === 'chase') {
        this.say('MON DIEU! A CRIMINAL POTATO!');
        emit('sound', { kind: 'alarm' });
      }
    }
    if (this.chefState === 'chase' && !this.hidden && this.rat.y > 515
        && Math.abs(this.chef.x - this.rat.x) < 48) this.finish(false);
  }

  update(time: number, delta: number): void {
    if (!this.playing || this.ended) return;
    const dt = Math.min(delta / 1000, .038);
    this.timeElapsed += dt;
    this.mobile = matchMedia('(pointer:coarse)').matches;
    this.climbingCooldown = Math.max(0, this.climbingCooldown - dt);
    if (this.grounded()) this.floorTime = time;
    if (this.hidden) {
      this.rat.setVelocityX(0);
    } else this.move(dt);
    this.updateChef(dt);

    if (this.foodGraphic) this.foodGraphic.setPosition(this.rat.x, this.rat.y - 68);
    if (this.mobile && this.foodHeld && this.nearHole() && !this.hidden) this.interact();
    if (this.messageUntil > 0 && time >= this.messageUntil) {
      this.notice.setVisible(false); this.messageUntil = 0;
    } else if (this.messageUntil) this.notice.setPosition(Phaser.Math.Clamp(this.rat.x, 265, W - 265), this.rat.y - 152);

    // Squash and stretch, body sways when running but keeps collision independent.
    if (!this.climbing && !this.hidden && this.rat.active) {
      const body = this.rat.body as Phaser.Physics.Arcade.Body;
      const moving = Math.abs(body.velocity.x);
      const bounce = this.grounded() ? Math.sin(this.timeElapsed * (moving > 50 ? 25 : 4)) : 0;
      const scX = .47 * (moving > 50 ? 1.03 : 1);
      const scY = .47 - (moving > 50 ? Math.abs(bounce) * .045 : 0);
      this.rat.setScale(scX, scY);
      this.rat.setAngle(moving > 50 ? bounce * 3.1 : Math.sin(this.timeElapsed * 3) * 1.2);
    }

    this.statusClock += delta;
    if (this.statusClock > 110) {
      this.statusClock = 0;
      this.drawPrompt();
      this.updateHud();
    }
  }

  private drawPrompt(): void {
    if (this.hidden || this.ended) { this.prompt.setVisible(false); return; }
    let message = '';
    if (this.nearHole()) message = this.foodHeld ? 'DELIVER YOUR STOLEN SNACK' : 'HIDE IN YOUR HOLE';
    else if (this.nearestFood() && !this.foodHeld)
      message = this.energy >= 99.9 ? 'STEAL THE SNACK!' : 'EAT FOR ENERGY';
    else if (this.hideSpot()) message = 'HIDE HERE';
    if (message) this.prompt.setText(message).setPosition(
      Phaser.Math.Clamp(this.rat.x, 255, W - 235), this.rat.y - 120);
    this.prompt.setVisible(Boolean(message) && this.messageUntil === 0);
  }

  private updateHud(): void {
    const ui = (id: string, content: string) => {
      const node = document.getElementById(id);
      if (node && node.textContent !== content) node.textContent = content;
    };
    ui('energy-value', String(Math.ceil(this.energy)));
    ui('delivered-value', String(this.collected));
    ui('held-value', this.foodHeld ? this.foodHeld.toUpperCase() : 'NONE');
    ui('action-label', this.hidden ? 'UNHIDE' : this.nearHole() && this.foodHeld ? 'DELIVER'
      : this.nearestFood() && !this.foodHeld ? this.energy >= 99.9 ? 'STEAL' : 'EAT'
      : this.hideSpot() ? 'HIDE' : 'ACTION');
    const energyBar = document.getElementById('energy-bar');
    if (energyBar) energyBar.style.width = Math.round(this.energy) + '%';
    const alert = document.getElementById('chef-alert');
    if (alert) alert.style.width = Math.round(this.chefAlert) + '%';
    ui('game-status', this.hidden ? 'SAFE • ' + this.hidingPlace.toUpperCase()
      : this.chefState === 'chase' ? 'RUN! THE CHEF SAW YOU!'
      : this.foodHeld ? 'TAKE IT HOME, RAT!' : 'STEAL. EAT. REPEAT.');
  }

  private say(message: string): void {
    if (!this.notice) return;
    this.notice.setText(message).setPosition(Phaser.Math.Clamp(this.rat.x, 265, W - 265), this.rat.y - 152).setVisible(true);
    this.messageUntil = this.time.now + 1600;
  }

  private finish(win: boolean): void {
    if (this.ended) return;
    this.ended = true; releaseVirtualControls();
    this.rat.setVelocity(0, 0);
    this.prompt.setVisible(false);
    if (!win) {
      this.chef.setTint(0xffa8a8);
      this.rat.setVisible(false);
      this.foodGraphic?.setVisible(false);
      const cake = this.add.image(this.rat.x, this.rat.y, 'snack-cake')
        .setScale(.05).setDepth(100);
      this.tweens.add({ targets: cake, scale: 1.45, duration: 670, ease: 'Back.Out' });
      emit('sound', { kind: 'caught' });
    } else emit('sound', { kind: 'win' });
    this.time.delayedCall(win ? 400 : 930, () => emit('dialog', win ? {
      mode: 'won', title: 'A HEIST OF LEGENDARY STUPIDITY',
      subtitle: '3 snacks delivered. The chef needs therapy.', button: 'STEAL AGAIN',
    } : {
      mode: 'lost', title: 'YOU HAVE BECOME RAT CAKE.',
      subtitle: 'Baked at 180° of pure embarrassment.', button: 'TRY AGAIN, RAT',
    }));
  }
}
