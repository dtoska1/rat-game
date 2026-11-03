import Phaser from 'phaser';
import roomUrl from '../assets/room.png?url';
import ratUrl from '../assets/rat.png?url';
import chefUrl from '../assets/chef.png?url';
import cakeUrl from '../assets/cake.png?url';
import eclairUrl from '../assets/eclair.png?url';
import macaronUrl from '../assets/macaron.png?url';
import cheeseUrl from '../assets/cheese.png?url';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 680;
const FLOOR_Y = 605;
const GOAL = 3;

type FoodKind = 'cake' | 'eclair' | 'macaron' | 'cheese';
type ChefMode = 'patrol' | 'chase' | 'search';
interface FoodItem {
  kind: FoodKind;
  energy: number;
  sprite: Phaser.GameObjects.Image;
  consumed: boolean;
}
interface ClimbZone { x: number; top: number; bottom: number }

const FOOD_DATA: Record<FoodKind, { energy: number; label: string }> = {
  cake: { energy: 35, label: 'Cake' },
  eclair: { energy: 25, label: 'Éclair' },
  macaron: { energy: 18, label: 'Macaron' },
  cheese: { energy: 12, label: 'Cheese' },
};

const VIRTUAL = { left: false, right: false, up: false, boost: false };
export function setVirtualControl(control: keyof typeof VIRTUAL, value: boolean): void {
  VIRTUAL[control] = value;
}
export function releaseVirtualControls(): void {
  Object.keys(VIRTUAL).forEach((key) => (VIRTUAL[key as keyof typeof VIRTUAL] = false));
}

function updateText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el && el.textContent !== value) el.textContent = value;
}
function updateBar(id: string, value: number): void {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Phaser.Math.Clamp(value, 0, 100)}%`;
}
function gameEvent(name: string, data?: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent(`ratgame:${name}`, { detail: data }));
}

export class KitchenScene extends Phaser.Scene {
  private rat!: Phaser.Physics.Arcade.Sprite;
  private chef!: Phaser.GameObjects.Image;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private foods: FoodItem[] = [];
  private carriedFood: FoodKind | null = null;
  private heldIcon: Phaser.GameObjects.Image | null = null;
  private energy = 47;
  private delivered = 0;
  private hidden = false;
  private hidingSpot = '';
  private started = false;
  private finished = false;
  private chefMode: ChefMode = 'patrol';
  private chefFacing = 1;
  private patrolClock = 0;
  private chaseCooldown = 0;
  private searchTimer = 0;
  private lastSeenX = 0;
  private suspicion = 0;
  private noticeTime = 0;
  private notice!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private animClock = 0;
  private climbZones: ClimbZone[] = [
    { x: 148, top: 401, bottom: 607 },
    { x: 558, top: 401, bottom: 607 },
    { x: 776, top: 356, bottom: 607 },
    { x: 1017, top: 356, bottom: 607 },
    { x: 1068, top: 348, bottom: 605 },
    { x: 1228, top: 273, bottom: 606 },
  ];

  constructor() { super({ key: 'KitchenScene' }); }

  /**
   * Phaser reuses the same Scene instance after stop()/start(). Field
   * initializers run only at construction, NOT once per replay. Reset every
   * round-specific field before new physics objects and food are created.
   */
  private resetRunState(): void {
    this.foods = [];
    this.carriedFood = null;
    this.heldIcon = null;
    this.energy = 47;
    this.delivered = 0;
    this.hidden = false;
    this.hidingSpot = '';
    this.started = false;
    this.finished = false;
    this.chefMode = 'patrol';
    this.chefFacing = 1;
    this.patrolClock = 0;
    this.chaseCooldown = 0;
    this.searchTimer = 0;
    this.lastSeenX = 0;
    this.suspicion = 0;
    this.noticeTime = 0;
    this.animClock = 0;
    releaseVirtualControls();
  }

  preload(): void {
    // Pre-rendered PNGs avoid SVG-to-texture conversion failures on some browsers.
    this.load.on('loaderror', (file: { key?: string; url?: string }) => {
      const info = file.key || file.url || 'unknown asset';
      window.dispatchEvent(new CustomEvent('ratgame:fatal', { detail: `Could not load game asset: ${info}` }));
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
    this.resetRunState();
    this.add.image(0, 0, 'room').setOrigin(0, 0).setDepth(-10);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#ffe5d7');

    this.platforms = this.physics.add.staticGroup();
    this.makeSurface(800, FLOOR_Y + 22, 1600, 44);
    this.makeSurface(350, 399, 492, 18); // the cake table
    this.makeSurface(902, 357, 262, 15); // top of the cupboard
    this.makeSurface(857, 461, 240, 18); // cupboard lower ledge
    this.makeSurface(1308, 271, 190, 14); // top of fridge
    this.makeSurface(636, 503, 90, 15); // chair seat

    this.rat = this.physics.add.sprite(1460, 540, 'rat').setScale(0.75);
    this.rat.setDepth(15).setCollideWorldBounds(true);
    this.rat.setSize(66, 65).setOffset(29, 36);
    this.rat.setBounce(0);
    (this.rat.body as Phaser.Physics.Arcade.Body).setMaxVelocity(410, 760);
    this.physics.add.collider(this.rat, this.platforms);
    this.physics.world.gravity.y = 1120;

    this.chef = this.add.image(172, 531, 'chef').setScale(0.68).setDepth(13);
    this.spawnFoods();

    this.notice = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '19px', fontStyle: 'bold',
      color: '#49383f', backgroundColor: '#fff7dd', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setDepth(50).setVisible(false).setStroke('#fff7dd', 2);

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '17px', fontStyle: 'bold',
      color: '#563643', backgroundColor: '#fff5e9', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(40).setVisible(false);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,E,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.startFollow(this.rat, false, 0.09, 0.1);
    this.cameras.main.setDeadzone(120, 100);
    this.input.keyboard!.on('keydown-ESC', () => gameEvent('pause-request'));
    this.input.keyboard!.on('keydown-E', () => { if (this.started && !this.finished) this.interact(); });
    this.input.keyboard!.on('keydown-S', () => { if (this.started && !this.finished) this.toggleHide(); });
    this.input.keyboard!.on('keydown-DOWN', () => { if (this.started && !this.finished) this.toggleHide(); });
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => releaseVirtualControls());

    this.refreshHUD();
    gameEvent('ready');
    // The Scene has created every critical gameplay object at this point.
  }

  startPlaying(): void {
    if (!this.started) {
      this.started = true;
      this.flash('Run for the pastries! 🧀');
    }
  }

  virtualInteract(): void { if (this.started && !this.finished) this.interact(); }
  virtualHide(): void { if (this.started && !this.finished) this.toggleHide(); }
  virtualJump(): void { if (this.started && !this.finished) this.jump(); }

  private makeSurface(x: number, y: number, width: number, height: number): void {
    const rect = this.add.rectangle(x, y, width, height, 0xff0000, 0);
    this.physics.add.existing(rect, true);
    const body = rect.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    body.checkCollision.down = false;
    body.updateFromGameObject();
    this.platforms.add(rect);
  }

  private spawnFoods(): void {
    // Most food is intentionally on furniture so climbing is required.
    const layout: Array<[FoodKind, number, number]> = [
      ['cake', 181, 365], ['eclair', 280, 368], ['macaron', 367, 369],
      ['cake', 470, 367], ['eclair', 560, 368],
      ['cheese', 710, 304], ['macaron', 787, 307],
      ['eclair', 872, 429], ['cake', 976, 429],
      ['cheese', 1180, 568], ['macaron', 1370, 565],
    ];
    for (const [kind, x, y] of layout) {
      const sprite = this.add.image(x, y, kind).setDepth(8).setScale(0.85);
      this.tweens.add({ targets: sprite, y: y - 3, duration: 940 + Phaser.Math.Between(0, 230),
        repeat: -1, yoyo: true, ease: 'Sine.easeInOut' });
      this.foods.push({ kind, energy: FOOD_DATA[kind].energy, sprite, consumed: false });
    }
  }

  update(_time: number, delta: number): void {
    if (!this.started || this.finished) return;
    const dt = Math.min(delta / 1000, 0.045);
    this.animClock += dt;
    this.patrolClock += dt;
    if (this.noticeTime > 0) {
      this.noticeTime -= dt;
      this.notice.setPosition(this.rat.x, this.rat.y - 86);
      if (this.noticeTime <= 0) this.notice.setVisible(false);
    }

    if (!this.hidden) this.moveRat(dt);
    else this.rat.setVelocity(0, 0);
    this.moveChef(dt);
    this.positionCarriedFood();
    this.showNearbyPrompt();
    this.refreshHUD();
  }

  private moveRat(dt: number): void {
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.A.isDown || this.keys.LEFT.isDown || VIRTUAL.left;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown || VIRTUAL.right;
    const upward = this.keys.W.isDown || this.keys.UP.isDown || VIRTUAL.up;
    const direction = Number(right) - Number(left);
    const boosting = (this.keys.SHIFT.isDown || VIRTUAL.boost) && this.energy > 0 && direction !== 0;
    let speed = boosting ? 335 : 188;
    if (this.carriedFood) speed *= 0.78;
    if (boosting) this.energy = Math.max(0, this.energy - 32 * dt);

    const climbing = upward && this.climbZones.some(zone =>
      Math.abs(this.rat.x - zone.x) < 35 && this.rat.y > zone.top - 60 && this.rat.y < zone.bottom + 8
    );
    if (climbing) {
      body.setAllowGravity(false);
      this.rat.setVelocityY(-207);
    } else {
      body.setAllowGravity(true);
    }
    this.rat.setVelocityX(direction * speed);
    if ((Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) && !climbing) this.jump();
    if (direction !== 0) {
      this.rat.setFlipX(direction < 0);
      this.rat.setAngle(Math.sin(this.animClock * (boosting ? 43 : 19)) * (boosting ? 10 : 4));
    } else {
      this.rat.setAngle(Math.sin(this.animClock * 3.4) * 2);
    }
  }

  private jump(): void {
    if (this.hidden) return;
    const body = this.rat.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      body.setAllowGravity(true);
      this.rat.setVelocityY(-470);
      this.rat.setAngle(-8);
    }
  }

  private nearestFood(): FoodItem | undefined {
    return this.foods.filter(f => !f.consumed).sort((a, b) =>
      Phaser.Math.Distance.Between(this.rat.x, this.rat.y, a.sprite.x, a.sprite.y) -
      Phaser.Math.Distance.Between(this.rat.x, this.rat.y, b.sprite.x, b.sprite.y)
    )[0];
  }

  private interact(): void {
    if (this.hidden) { this.toggleHide(); return; }
    if (Math.abs(this.rat.x - 1510) < 90 && this.rat.y > 475) {
      if (this.carriedFood) {
        const kind = this.carriedFood;
        this.carriedFood = null;
        this.heldIcon?.destroy(); this.heldIcon = null;
        this.delivered += 1;
        this.flash(`Delivered ${FOOD_DATA[kind].label}! ${this.delivered}/${GOAL} 🎉`);
        if (this.delivered >= GOAL) this.finish(true);
      } else this.toggleHide();
      return;
    }
    const item = this.nearestFood();
    if (!item || Phaser.Math.Distance.Between(this.rat.x, this.rat.y, item.sprite.x, item.sprite.y) > 83) {
      this.flash(this.carriedFood ? 'Take that food HOME!' : 'Get closer to some food!');
      return;
    }
    if (this.carriedFood) { this.flash('One snack at a time, greedy rat!'); return; }
    item.consumed = true;
    this.tweens.killTweensOf(item.sprite);
    item.sprite.destroy();
    if (this.energy >= 99.9) {
      this.carriedFood = item.kind;
      this.heldIcon = this.add.image(this.rat.x, this.rat.y - 61, item.kind).setScale(0.58).setDepth(20);
      this.flash(`${FOOD_DATA[item.kind].label} stolen! Get HOME!`);
    } else {
      this.energy = Math.min(100, this.energy + item.energy);
      this.flash(`YUM! +${item.energy} energy`);
    }
  }

  private positionCarriedFood(): void {
    if (!this.heldIcon) return;
    this.heldIcon.setPosition(this.rat.x, this.rat.y - 65 + Math.sin(this.animClock * 7) * 3);
  }

  private toggleHide(): void {
    if (this.hidden) {
      this.hidden = false;
      this.hidingSpot = '';
      this.rat.setAlpha(1);
      (this.rat.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      this.flash('Back to rat business!');
      return;
    }
    const zones: Array<[number, number, string]> = [
      [1510, 95, 'rat hole'], [902, 125, 'cupboard'],
      [1325, 110, 'fridge'], [352, 100, 'under the table'],
    ];
    const safe = zones.find(([x, r]) => Math.abs(this.rat.x - x) < r && this.rat.y > 478);
    if (!safe) { this.flash('No hiding spot here!'); return; }
    this.hidden = true;
    this.hidingSpot = safe[2];
    this.rat.setVelocity(0, 0);
    this.rat.setAlpha(safe[2] === 'rat hole' ? 0.2 : 0.38);
    this.flash(`Hidden in ${this.hidingSpot} 🤫`);
  }

  private canChefSeeRat(): boolean {
    const dist = Math.abs(this.chef.x - this.rat.x);
    if (this.hidden || dist > 235 || this.rat.y < 459) return false;
    // The first prototype uses short-range detection, not full pathfinding or raycasts.
    return true;
  }

  private moveChef(dt: number): void {
    const seen = this.canChefSeeRat();
    if (seen) {
      if (this.chefMode !== 'chase') this.flash('MON DIEU!! THE RAT!!!');
      this.chefMode = 'chase';
      this.chaseCooldown = 2.1;
      this.lastSeenX = this.rat.x;
      this.suspicion = Math.min(100, this.suspicion + 220 * dt);
    } else if (this.chefMode === 'chase') {
      this.chaseCooldown -= dt;
      if (this.chaseCooldown <= 0) {
        this.chefMode = 'search'; this.searchTimer = 2.5;
      }
    } else if (this.chefMode === 'search') {
      this.searchTimer -= dt;
      this.suspicion = Math.max(5, this.suspicion - 13 * dt);
      if (this.searchTimer <= 0) this.chefMode = 'patrol';
    } else this.suspicion = Math.max(0, this.suspicion - 22 * dt);

    let target = this.chef.x;
    let speed = 0;
    if (this.chefMode === 'chase') { target = this.lastSeenX; speed = 205; }
    else if (this.chefMode === 'search') { target = this.lastSeenX; speed = 72; }
    else { target = 380 + Math.sin(this.patrolClock * 0.7) * 280; speed = 92; }
    const dx = target - this.chef.x;
    const motion = Math.abs(dx) > 8 ? Math.sign(dx) * Math.min(Math.abs(dx), speed * dt) : 0;
    this.chef.x = Phaser.Math.Clamp(this.chef.x + motion, 70, 1545);
    if (motion !== 0) this.chefFacing = Math.sign(motion);
    this.chef.setFlipX(this.chefFacing < 0);
    this.chef.setAngle(Math.sin(this.animClock * (this.chefMode === 'chase' ? 22 : 9)) * (this.chefMode === 'chase' ? 6 : 2));
    this.chef.setY(532 + Math.abs(Math.sin(this.animClock * (this.chefMode === 'chase' ? 19 : 8))) * 3);
    this.chef.setTint(this.chefMode === 'chase' ? 0xffc7c9 : 0xffffff);

    if (!this.hidden && this.chefMode === 'chase' && Math.abs(this.rat.x - this.chef.x) < 57 && this.rat.y > 485) {
      this.finish(false);
    }
  }

  private showNearbyPrompt(): void {
    if (this.hidden || this.finished) { this.prompt.setVisible(false); return; }
    let message = '';
    if (Math.abs(this.rat.x - 1510) < 95 && this.rat.y > 480) {
      message = this.carriedFood ? 'E · Deliver food' : 'S · Hide at HOME';
    } else {
      const item = this.nearestFood();
      if (item && Phaser.Math.Distance.Between(this.rat.x, this.rat.y, item.sprite.x, item.sprite.y) < 83) {
        message = this.carriedFood ? 'Go home to deliver!' : this.energy >= 99.9 ? 'E · Steal this food!' : `E · Eat (+${item.energy})`;
      } else if (this.climbZones.some(z => Math.abs(this.rat.x-z.x)<42 && this.rat.y>z.top+5)) {
        message = 'W / ↑ · Climb';
      }
    }
    this.prompt.setVisible(message.length > 0);
    if (message) this.prompt.setText(message).setPosition(this.rat.x, this.rat.y - 106);
  }

  private flash(message: string): void {
    if (!this.notice) return;
    this.notice.setText(message).setPosition(this.rat.x, this.rat.y - 85).setVisible(true);
    this.noticeTime = 1.5;
  }

  private refreshHUD(): void {
    updateText('energy-label', `${Math.ceil(this.energy)}%`);
    updateText('delivered-label', `${this.delivered}/${GOAL}`);
    updateText('carrying-label', this.carriedFood ? FOOD_DATA[this.carriedFood].label : 'Nothing');
    updateText('status-label', this.hidden ? `HIDDEN · ${this.hidingSpot.toUpperCase()}` : this.chefMode === 'chase' ? 'CHEF IS CHASING!' : this.chefMode === 'search' ? 'CHEF IS SEARCHING' : 'STEAL SOMETHING!');
    updateBar('energy-fill', this.energy);
    updateBar('suspicion-fill', this.suspicion);
  }

  private finish(won: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.rat.setVelocity(0, 0);
    this.prompt.setVisible(false);
    if (won) {
      gameEvent('dialog', {
        mode: 'won', icon: '🏆', kicker: 'THE GREAT ÉCLAIR HEIST',
        title: 'STUPIDLY WELL DONE!',
        description: 'You stole 3 snacks and brought them home. The chef is emotionally devastated.',
        button: 'STEAL AGAIN',
      });
    } else {
      gameEvent('dialog', {
        mode: 'lost', icon: '🍰', kicker: 'MON DIEU!',
        title: 'YOU ARE A RAT CAKE.',
        description: 'The chef finally caught you. His pâtisserie has a deeply concerning new special.',
        button: 'ONE MORE RAT?',
      });
    }
  }
}
