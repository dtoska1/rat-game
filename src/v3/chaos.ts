import { FLOOR, WORLD } from './level';
import type { Rat } from './rat';

// A real moving floor obstacle for the bonus mission. It is deliberately
// forgiving: a bump costs energy and raises an alarm, rather than ending a run.
export class MopBot {
  x = 2140;
  direction: 1 | -1 = -1;
  phase = 0;
  cooldown = 0;

  update(dt: number, rat: Rat, active: boolean, disabled: boolean): boolean {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!active) return false;
    this.phase += dt * (disabled ? 1.1 : 8);
    if (disabled) return false;

    this.x += this.direction * 146 * dt;
    if (this.x < 1330) {
      this.x = 1330;
      this.direction = 1;
    } else if (this.x > 2550) {
      this.x = 2550;
      this.direction = -1;
    }

    if (
      this.cooldown > 0 ||
      rat.hidden ||
      rat.y < FLOOR - 30 ||
      Math.abs(rat.x - this.x) > 38
    ) return false;

    this.cooldown = 2.2;
    rat.energy = Math.max(0, rat.energy - 16);
    // Knock the rat away without ever sending it out of the world.
    rat.x = Math.max(24, Math.min(WORLD - 24,
      rat.x + (rat.x <= this.x ? -48 : 48)
    ));
    rat.vx = 0;
    return true;
  }
}
