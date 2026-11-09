type Cue =
  | 'eat'
  | 'jump'
  | 'take'
  | 'delivery'
  | 'spoon'
  | 'caught'
  | 'win'
  | 'hide'
  | 'boost';
const notes: Record<Cue, number[]> = {
  eat: [420, 550],
  jump: [150, 310],
  take: [349, 523],
  delivery: [392, 494, 587],
  spoon: [1150, 740, 480, 260],
  caught: [280, 176, 108],
  win: [392, 494, 587, 784],
  hide: [210, 145],
  boost: [130, 160],
};
export class Sound {
  muted = false;
  private audio?: AudioContext;
  constructor() {
    try {
      this.muted = localStorage.getItem('rat-v3-muted') === 'yes';
    } catch {
      /* private browsing */
    }
  }
  unlock() {
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume().catch(() => {});
    } catch {
      /* audio is optional */
    }
  }
  toggle() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('rat-v3-muted', this.muted ? 'yes' : 'no');
    } catch {
      /* unavailable */
    }
    this.unlock();
  }
  play(cue: Cue) {
    if (this.muted || !this.audio || this.audio.state !== 'running') return;
    const ctx = this.audio;
    notes[cue].forEach((hz, i) => {
      const osc = ctx.createOscillator(),
        amp = ctx.createGain(),
        t = ctx.currentTime + i * 0.085;
      osc.type = cue === 'spoon' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.74, t + 0.12);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }
}
