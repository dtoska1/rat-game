import {
  FLOOR,
  HOME,
  WORLD,
  slabs,
  ladderAt,
  rack,
  type Station,
} from './level';
import type { Controls } from './controls';
export class Rat {
  x = HOME;
  y = FLOOR;
  vx = 0;
  vy = 0;
  facing = -1;
  grounded = true;
  climbed = false;
  energy = 44;
  carried: Station | null = null;
  hidden = 'Home';
  eating = 0;
  boosting = false;
  coyote = 0.1;
  buffer = 0;
  phase = 0;
  pose = 'hide';
  private jumpedOffLadder = false;
  private touchAscent = false;
  update(dt: number, keys: Controls) {
    this.eating = Math.max(0, this.eating - dt);
    const direction = keys.direction();
    const nearby = ladderAt(this.x, this.y);
    const touchPress = keys.take('jump');
    const spacePress = keys.take('space');
    const startAscent = touchPress && !!nearby && !this.climbed;
    if (startAscent) {
      this.touchAscent = true;
      this.buffer = 0;
    } else if (!nearby || spacePress || touchPress) this.touchAscent = false;
    const climbHeld = keys.down('up') || this.touchAscent;
    if (!climbHeld || this.grounded) this.jumpedOffLadder = false;
    const ladder = climbHeld && !this.jumpedOffLadder && nearby;
    const upPressed = keys.take('up');
    const jumpPressed =
      spacePress || (touchPress && !startAscent) || (upPressed && !ladder);
    this.buffer = jumpPressed ? 0.15 : Math.max(0, this.buffer - dt);
    this.coyote = this.grounded ? 0.1 : Math.max(0, this.coyote - dt);
    this.boosting = false;
    if (this.hidden) {
      this.pose = 'hide';
      if (jumpPressed || (this.hidden === 'Home' && direction !== 0))
        this.hidden = '';
      else {
        this.vx = 0;
        return;
      }
    }
    this.boosting =
      keys.down('boost') && !!direction && this.energy > 0 && !this.eating;
    if (this.boosting) this.energy = Math.max(0, this.energy - 19 * dt);
    const speed = 224 * (this.carried?.weight ?? 1) + (this.boosting ? 128 : 0);
    const target = direction * speed;
    const reversing = direction * this.vx < 0;
    const change = (reversing ? 4400 : direction ? 2500 : 2400) * dt;
    this.vx +=
      Math.sign(target - this.vx) *
      Math.min(Math.abs(target - this.vx), change);
    if (direction) this.facing = direction;
    const launch = this.buffer > 0 && (this.coyote > 0 || this.climbed);
    this.climbed = !!ladder && !launch;
    if (ladder && !launch) {
      this.x += (rack(ladder) - this.x) * Math.min(1, 14 * dt);
      this.y = Math.max(ladder.top, this.y - 190 * dt);
      this.vx = 0;
      this.vy = 0;
      this.grounded = this.y === ladder.top;
      this.buffer = 0;
    } else {
      if (launch) {
        this.jumpedOffLadder = climbHeld;
        this.vy = this.carried ? -600 : -650;
        this.grounded = false;
        this.coyote = 0;
        this.buffer = 0;
      }
      // Even a one-frame tap clears the first stool. Holding extends the arc.
      if (!keys.down('jump') && !keys.down('space') && !keys.down('up'))
        this.vy = Math.max(this.vy, -545);
      this.vy = Math.min(870, this.vy + 1480 * dt);
      let nextX = Math.max(24, Math.min(WORLD - 24, this.x + this.vx * dt));
      for (const s of slabs) {
        if (s.oneWay) continue;
        if (this.y <= s.top + 1 || this.y - 36 >= s.top + s.thick - 1) continue;
        if (this.x + 13 <= s.left && nextX + 13 > s.left) {
          nextX = s.left - 13;
          this.vx = 0;
        }
        if (this.x - 13 >= s.right && nextX - 13 < s.right) {
          nextX = s.right + 13;
          this.vx = 0;
        }
      }
      this.x = nextX;
      let nextY = this.y + this.vy * dt;
      this.grounded = false;
      for (const s of slabs) {
        if (this.x + 13 <= s.left || this.x - 13 >= s.right) continue;
        if (this.vy >= 0 && this.y <= s.top + 0.1 && nextY >= s.top) {
          nextY = s.top;
          this.vy = 0;
          this.grounded = true;
        } else if (
          !s.oneWay &&
          this.vy < 0 &&
          this.y - 36 >= s.top + s.thick &&
          nextY - 36 <= s.top + s.thick
        ) {
          nextY = s.top + s.thick + 36;
          this.vy = 0;
        }
      }
      if (nextY >= FLOOR) {
        nextY = FLOOR;
        this.vy = 0;
        this.grounded = true;
      }
      this.y = nextY;
    }
    this.phase += dt * (this.boosting ? 17 : Math.abs(this.vx) > 8 ? 11 : 3.6);
    this.pose = this.climbed
      ? 'climb'
      : this.eating
        ? 'eat'
        : !this.grounded
          ? 'jump'
          : this.carried
            ? 'carry'
            : this.boosting
              ? 'sprint'
              : Math.abs(this.vx) > 8
                ? 'walk'
                : 'idle';
  }
}
