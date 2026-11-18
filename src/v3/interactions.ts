import {
  coverAt,
  cheeseCaches,
  gadgets,
  REQUIRED_GADGETS,
  FLOOR,
  HOME,
  pastryX,
  reachable,
  sampleX,
  SPOON,
  stations,
  type Pastry,
  type Station,
} from './level';
import { Notebook } from './notebook';
import type { Rat } from './rat';
import type { Chef } from './chef';
import type { Sound } from './sound';
type Choice = {
  action:
    | 'emerge'
    | 'deliver'
    | 'steal'
    | 'sample'
    | 'hide'
    | 'clang'
    | 'hungry'
    | 'collect'
    | 'gadget'
    | 'finish'
    | 'none';
  label: string;
  station?: Station;
  cache?: (typeof cheeseCaches)[number];
  gadget?: (typeof gadgets)[number];
};
export class Pantry {
  notebook = new Notebook();
  hardMode = false;
  delivered = new Set<Pastry>();
  phase: 'pastries' | 'cheese' = 'pastries';
  cheeseFound = new Set<string>();
  gadgetsUsed = new Set<string>();
  mopDisabled = 0;
  mopHits = 0;
  squeakCooldown = 0;
  squeaks = 0;
  escapeActive = false;
  escapeLeft = 0;
  complete = false;
  clang = 0;
  last = '';
  message = '';
  messageTime = 0;
  choose(r: Rat): Choice {
    if (r.hidden) return { action: 'emerge', label: 'Come out' };
    if (r.carried && Math.abs(r.x - HOME) < 68 && r.y >= FLOOR - 12)
      return { action: 'deliver', label: 'Stash ' + r.carried.name };
    if (this.phase === 'cheese') {
      if (
        this.cheeseFound.size === cheeseCaches.length &&
        this.gadgetsUsed.size >= REQUIRED_GADGETS &&
        Math.abs(r.x - HOME) < 68 &&
        r.y >= FLOOR - 12
      ) return { action: 'finish', label: 'Celebrate the heist!' };
      const cache = cheeseCaches.find(
        (c) => !this.cheeseFound.has(c.id) && reachable(r.x, r.y, c.x, c.y)
      );
      if (cache)
        return { action: 'collect', label: 'Pocket ' + cache.name, cache };
      // Devices sit on the floor, close enough to use without pixel-perfect positioning.
      const gadget = gadgets.find(
        (g) => !this.gadgetsUsed.has(g.id) &&
          r.y >= FLOOR - 12 && Math.abs(r.x - g.x) < 56
      );
      if (gadget)
        return { action: 'gadget', label: 'Sabotage ' + gadget.name, gadget };
    }
    for (const s of stations) {
      if (
        this.phase === 'pastries' &&
        !r.carried &&
        !this.delivered.has(s.kind) &&
        reachable(r.x, r.y, pastryX(s), s.top)
      ) {
        return r.energy >= 100
          ? { action: 'steal', label: 'Take ' + s.name, station: s }
          : { action: 'hungry', label: 'Need full energy · samples →' };
      }
      if (reachable(r.x, r.y, sampleX(s), s.top) && r.energy < 100)
        return {
          action: 'sample',
          label: 'Taste · +' + s.gain + '%',
          station: s,
        };
    }
    const cover = coverAt(r.x, r.y);
    if (cover) return { action: 'hide', label: 'Hide · ' + cover.name };
    if (Math.abs(r.x - SPOON) < 58 && r.y >= FLOOR - 100 && this.clang <= 0)
      return { action: 'clang', label: 'Knock the spoon' };
    return { action: 'none', label: '' };
  }
  tell(msg: string) {
    this.message = msg;
    this.messageTime = 2.4;
  }
  use(r: Rat, chef: Chef, sound: Sound) {
    const c = this.choose(r);
    switch (c.action) {
      case 'emerge':
        r.hidden = '';
        sound.play('hide');
        break;
      case 'hide':
        r.hidden = coverAt(r.x, r.y)!.name;
        r.vx = 0;
        sound.play('hide');
        break;
      case 'sample':
        if (r.eating > 0) return;
        this.notebook.samples.add(c.station!.kind);
        if (this.notebook.samples.size === 3) this.notebook.stamp('sampler');
        r.energy = Math.min(100, r.energy + c.station!.gain);
        r.eating = 0.4;
        sound.play('eat');
        this.tell(
          r.energy === 100
            ? 'Full belly! Take a whole pastry.'
            : '+' + c.station!.gain + '% energy'
        );
        break;
      case 'hungry':
        this.tell('Taste the little samples on the right.');
        break;
      case 'steal':
        r.carried = c.station!;
        sound.play('take');
        this.tell('Take it home →');
        break;
      case 'deliver':
        this.delivered.add(r.carried!.kind);
        r.carried = null;
        r.hidden = 'Home';
        sound.play('delivery');
        if (this.delivered.size === stations.length) {
          this.phase = 'cheese';
          this.tell('Bonus mission unlocked: find 3 hidden cheese wedges!');
        } else this.tell('Safely stashed at home');
        break;
      case 'collect':
        this.cheeseFound.add(c.cache!.id);
        r.energy = Math.min(100, r.energy + (this.hardMode ? 14 : 18));
        chef.distract(c.cache!.x);
        sound.play('take');
        this.tell(
          this.cheeseFound.size === cheeseCaches.length
            ? 'All cheese pocketed! Sneak back home →'
            : 'Secret cheese ' + this.cheeseFound.size + '/3 · chef heard you!'
        );
        break;
      case 'gadget': {
        const g = c.gadget!;
        if (g.id === 'duck') this.notebook.stamp('duck');
        this.gadgetsUsed.add(g.id);
        if (g.id === 'breaker') {
          this.mopDisabled = this.hardMode ? 9 : 15;
          chef.distract(1180);
          this.tell(this.hardMode ? 'CLICK! Both bots sleep for 9 seconds.' :
            'CLICK! Mop bot is asleep for 15 seconds.');
        } else if (g.id === 'flour') {
          chef.blinded = this.hardMode ? 5 : 8;
          chef.distract(2550);
          this.tell(this.hardMode ? 'POOF! Chef is blinded for 5 seconds.' :
            'POOF! Chef cannot see through the flour for 8 seconds.');
        } else {
          chef.distract(2550);
          r.energy = Math.min(100, r.energy + (this.hardMode ? 20 : 30));
          this.tell(this.hardMode ? 'SQUEAK! The duck lures him. +20 energy!' :
            'SQUEAK! Chef follows the duck. +30 energy!');
        }
        sound.play('spoon');
        break;
      }
      case 'finish':
        this.complete = true;
        r.hidden = 'Home';
        sound.play('win');
        this.tell('A legendary pantry!');
        break;
      case 'clang':
        this.notebook.stamp('bell');
        this.clang = 9;
        chef.distract(SPOON);
        sound.play('spoon');
        this.tell('CLANG! Chef is checking the spoon.');
        break;
    }
    this.last = c.action;
  }
  squeak(r: Rat, chef: Chef, sound: Sound) {
    if (this.squeakCooldown > 0 || r.energy < 8 || r.hidden === 'Home') return;
    r.energy -= 8;
    this.squeakCooldown = 14;
    this.squeaks++;
    this.notebook.stamp('squeak');
    // A squeak deliberately gives away the rat's location: lure him, then flee.
    chef.distract(r.x);
    sound.play('spoon');
    this.tell('SQUEAK! Chef is coming here. Hide or run!');
  }
  get readyToEscape() {
    return this.phase === 'cheese' &&
      this.cheeseFound.size === cheeseCaches.length &&
      this.gadgetsUsed.size >= REQUIRED_GADGETS;
  }
  startEscape() {
    if (this.escapeActive || !this.readyToEscape || this.complete) return false;
    this.escapeActive = true;
    this.escapeLeft = 50;
    this.tell('FINAL ESCAPE! 50 seconds to reach home!');
    return true;
  }
}
