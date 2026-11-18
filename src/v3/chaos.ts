import { FLOOR, WORLD } from './level';
import type { Rat } from './rat';

// A bump is costly and attracts the chef, but never instantly ends a run.
// Hard Chaos uses a second bot and speeds both bots up as cheese is stolen.
export class MopBot {
  x: number;
  direction: 1 | -1 = -1;
  phase = 0;
  cooldown = 0;
  constructor(
    startX = 2140,
    private left = 1330,
    private right = 2550,
    private speed = 146
  ) {
    this.x = startX;
  }

  update(
    dt: number,
    rat: Rat,
    active: boolean,
    disabled: boolean,
    pace = 1,
    damage = 16
  ): boolean {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!active) return false;
    this.phase += dt * (disabled ? 1.1 : 8 * pace);
    if (disabled) return false;

    this.x += this.direction * this.speed * pace * dt;
    if (this.x < this.left) {
      this.x = this.left;
      this.direction = 1;
    } else if (this.x > this.right) {
      this.x = this.right;
      this.direction = -1;
    }

    if (
      this.cooldown > 0 ||
      rat.hidden ||
      rat.y < FLOOR - 30 ||
      Math.abs(rat.x - this.x) > 38
    ) return false;

    this.cooldown = 2.2;
    rat.energy = Math.max(0, rat.energy - damage);
    rat.x = Math.max(24, Math.min(WORLD - 24,
      rat.x + (rat.x <= this.x ? -48 : 48)
    ));
    rat.vx = 0;
    return true;
  }
}

export const STEAM_VENTS = [
  { x: 1680, offset: 0 },
  { x: 905, offset: 3.2 },
] as const;
export type SteamState = 'clear' | 'warning' | 'hot';

// Deliberately predictable 9.5-second cycles: 5.5s clear, 1.5s warning,
// then 2.5s of steam. The warning always precedes damage, even after pause.
export class SteamVents {
  elapsed = 0;
  hits = 0;
  private cooldown = 0;
  state(index: number): SteamState {
    const phase = (this.elapsed + STEAM_VENTS[index].offset) % 9.5;
    return phase < 5.5 ? 'clear' : phase < 7 ? 'warning' : 'hot';
  }
  update(dt: number, rat: Rat, active: boolean): number | null {
    if (!active) return null;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown > 0 || rat.hidden || rat.y < FLOOR - 74)
      return null;

    for (let i = 0; i < STEAM_VENTS.length; i++) {
      const vent = STEAM_VENTS[i];
      if (this.state(i) !== 'hot' || Math.abs(rat.x - vent.x) > 48)
        continue;
      this.cooldown = 2;
      this.hits++;
      rat.energy = Math.max(0, rat.energy - 13);
      rat.vx *= 0.4;
      return vent.x;
    }
    return null;
  }
}
