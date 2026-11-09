import { blocksSight, FLOOR, HOME, hideouts } from './level';
import type { Rat } from './rat';
export type ChefMode =
  | 'patrol'
  | 'suspicious'
  | 'investigate'
  | 'search'
  | 'chase';
const patrol = [920, 2180, 1290, 2800, 480];
export class Chef {
  x = 1040;
  facing = -1;
  mode: ChefMode = 'patrol';
  alert = 0;
  phase = 0;
  seen = false;
  grab = 0;
  private recovery = 0;
  private reach = 0;
  private waypoint = 0;
  private wait = 0.5;
  private goal = this.x;
  private lost = 0;
  private lock = 0;
  private searched = '';
  private searchX = 0;
  distract(x: number) {
    this.goal = x;
    this.facing = Math.sign(x - this.x) || this.facing;
    this.mode = 'investigate';
    this.wait = 0;
    this.lock = 3.2;
    this.alert = 0;
    this.searched = '';
    this.grab = 0;
  }
  private move(goal: number, speed: number, dt: number) {
    const dx = goal - this.x;
    if (Math.abs(dx) < 3) return true;
    this.facing = Math.sign(dx);
    const step = Math.min(Math.abs(dx), speed * dt);
    this.x += this.facing * step;
    this.phase += step * 0.047;
    return false;
  }
  update(dt: number, r: Rat) {
    const dx = r.x - this.x,
      distance = Math.abs(dx);
    this.lock = Math.max(0, this.lock - dt);
    this.recovery = Math.max(0, this.recovery - dt);
    this.seen =
      !r.hidden &&
      r.x < HOME - 100 &&
      (dx * this.facing > 0 || distance < 55) &&
      distance < (r.boosting ? 440 : 365) &&
      !blocksSight(this.x, FLOOR - 150, r.x, r.y - 23);
    if (this.seen && !this.lock) {
      this.alert = distance < 165 ? 1 : Math.min(1, this.alert + dt / 0.18);
      this.goal = r.x;
      this.lost = 0;
      this.searched = '';
      if (this.alert >= 1) this.mode = 'chase';
      else if (this.mode !== 'chase') this.mode = 'suspicious';
    } else {
      this.alert = Math.max(0, this.alert - dt * 0.34);
      this.lost += dt;
      if (
        (this.mode === 'chase' && this.lost > 0.7) ||
        (this.mode === 'suspicious' && this.lost > 0.3)
      ) {
        this.mode = 'investigate';
        this.wait = 0;
        const spot = hideouts.find(
          (h) => h.name !== 'Home' && Math.abs(h.x - this.goal) < h.radius + 45
        );
        this.searched = spot?.name ?? '';
        this.searchX = spot?.x ?? this.goal;
        this.goal = this.searchX;
      }
    }
    switch (this.mode) {
      case 'patrol':
        if (this.wait > 0) this.wait -= dt;
        else if (this.move(patrol[this.waypoint], 88, dt)) {
          this.wait = 1.6;
          this.waypoint = (this.waypoint + 1) % patrol.length;
        }
        break;
      case 'suspicious':
        this.move(this.goal, 168, dt);
        break;
      case 'chase': {
        if (this.grab > 0) {
          this.grab = Math.max(0, this.grab - dt);
          if (this.grab === 0) {
            this.recovery = 0.48;
            if (this.seen && distance < 62 && FLOOR - r.y < this.reach)
              return true;
          }
        } else if (
          this.seen &&
          distance <= 65 &&
          !this.recovery &&
          FLOOR - r.y < 216
        ) {
          this.grab = 0.22;
          // A grab aimed at the floor can be jumped. A rat perched on a low table can be reached.
          this.reach = r.grounded && r.y < FLOOR - 40 ? 216 : 85;
        } else {
          this.move(
            Math.min(HOME - 120, this.goal),
            this.recovery > 0 ? 125 : 248,
            dt
          );
        }
        break;
      }
      case 'investigate':
        if (this.move(this.goal, 142, dt)) {
          this.mode = 'search';
          this.wait = 2.4;
        }
        break;
      case 'search':
        this.wait -= dt;
        if (
          this.wait < 1.1 &&
          this.searched &&
          r.hidden === this.searched &&
          Math.abs(this.x - r.x) < 60
        )
          return true;
        if (this.wait <= 0) {
          this.mode = 'patrol';
          this.searched = '';
          this.alert = 0;
          this.wait = 0.45;
        }
        break;
    }
    return false;
  }
}
