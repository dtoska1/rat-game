import {
  coverAt,
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
    | 'none';
  label: string;
  station?: Station;
};
export class Pantry {
  delivered = new Set<Pastry>();
  clang = 0;
  last = '';
  message = '';
  messageTime = 0;
  choose(r: Rat): Choice {
    if (r.hidden) return { action: 'emerge', label: 'Come out' };
    if (r.carried && Math.abs(r.x - HOME) < 68 && r.y >= FLOOR - 12)
      return { action: 'deliver', label: 'Stash ' + r.carried.name };
    for (const s of stations) {
      if (
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
    if (Math.abs(r.x - SPOON) < 58 && r.y >= FLOOR - 12 && this.clang <= 0)
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
        sound.play(this.delivered.size === 3 ? 'win' : 'delivery');
        this.tell('Safely stashed at home');
        break;
      case 'clang':
        this.clang = 9;
        chef.distract(SPOON);
        sound.play('spoon');
        this.tell('CLANG! Chef is checking the spoon.');
        break;
    }
    this.last = c.action;
  }
}
