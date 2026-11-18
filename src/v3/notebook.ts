// Optional, shuffled mischief to-dos. They reward creativity without blocking a win.
export const CHALLENGES = [
  { id: 'bell', label: 'Ring the dinner bell' },
  { id: 'sampler', label: 'Taste all three pastry samples' },
  { id: 'teapot', label: 'Hide as chef checks the teapot' },
  { id: 'duck', label: 'Let the rubber duck lead chef away' },
  { id: 'mop', label: 'Leap over the roaming mop' },
  { id: 'squeak', label: 'Squeak to bait the chef' },
] as const;
export type ChallengeId = (typeof CHALLENGES)[number]['id'];
export class Notebook {
  readonly tasks: readonly (typeof CHALLENGES)[number][];
  readonly done = new Set<ChallengeId>();
  readonly samples = new Set<string>();
  constructor(random: () => number = Math.random) {
    const shuffled = [...CHALLENGES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.tasks = shuffled.slice(0, 3);
  }
  stamp(id: ChallengeId) {
    if (this.tasks.some((t) => t.id === id)) this.done.add(id);
  }
  get completed() { return this.done.size; }
}
