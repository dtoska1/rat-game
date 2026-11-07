import Phaser from 'phaser';
import { KitchenScene, setVirtualControl, releaseVirtualControls } from './game/KitchenScene';
import './style.css';

type Mode = 'intro' | 'playing' | 'paused' | 'won' | 'lost';
let mode: Mode = 'intro';
let ready = false;
let mute = false;
let audio: AudioContext | null = null;

const ui = (id: string) => document.getElementById(id)!;
const overlay = ui('overlay');
const playButton = ui('play') as HTMLButtonElement;
const restartButton = ui('restart') as HTMLButtonElement;
const gameBox = ui('game');
const errorBox = ui('startup-error');

const game = new Phaser.Game({
  type: new URLSearchParams(location.search).get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: Math.max(300, gameBox.clientWidth),
  height: Math.max(300, gameBox.clientHeight),
  backgroundColor: '#f7e4d2',
  render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
  fps: { target: 60 },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1280 }, debug: false } },
  scene: [new KitchenScene()],
});
if (import.meta.env.DEV) (window as Window & { __ratGame?: Phaser.Game }).__ratGame = game;

function scene(): KitchenScene { return game.scene.getScene('KitchenScene') as KitchenScene; }
function setDialog(next: Mode, title: string, copy: string, button: string): void {
  mode = next;
  ui('overlay-title').textContent = title;
  ui('overlay-copy').textContent = copy;
  playButton.textContent = button;
  restartButton.hidden = next !== 'paused';
  ui('overlay-kicker').textContent = next === 'lost' ? 'BON APPÉTIT, MONSIEUR RAT' :
    next === 'won' ? 'A GRAND SUCCESS IN CRIME' : next === 'paused' ? 'A VERY SERIOUS PAUSE' : 'A VERY IMPORTANT MISSION';
  overlay.classList.remove('is-hidden');
  releaseAll();
}
function dismiss(): void { overlay.classList.add('is-hidden'); }
function start(): void {
  if (!ready) return;
  mode = 'playing';
  dismiss();
  scene().startPlaying();
}
function restart(): void {
  releaseAll();
  ready = false;
  mode = 'intro';
  dismiss();
  window.addEventListener('ratgame:ready', () => { ready = true; start(); }, { once: true });
  game.scene.stop('KitchenScene');
  game.scene.start('KitchenScene');
}
function pause(): void {
  if (!ready || mode === 'won' || mode === 'lost') return;
  if (mode === 'paused') {
    mode = 'playing'; game.scene.resume('KitchenScene'); dismiss();
  } else if (mode === 'playing') {
    game.scene.pause('KitchenScene');
    setDialog('paused','THE RAT IS THINKING.','The chef is frozen too. Nobody tell him.','RESUME RAT BUSINESS');
  }
}
playButton.addEventListener('click', () => {
  if (mode === 'paused') pause();
  else if (mode === 'won' || mode === 'lost') restart();
  else start();
});
restartButton.addEventListener('click', restart);
ui('pause').addEventListener('click', pause);
ui('sound').addEventListener('click', () => {
  mute = !mute; ui('sound').textContent = mute ? '♫ OFF' : '♫ ON';
});

window.addEventListener('ratgame:ready', () => {
  ready = true;
  errorBox.classList.add('is-hidden');
});
window.addEventListener('ratgame:dialog', evt => {
  const info = (evt as CustomEvent<{mode: Mode;title:string;subtitle:string;button:string}>).detail;
  setDialog(info.mode, info.title, info.subtitle, info.button);
});
window.addEventListener('ratgame:pause-request', pause);
window.addEventListener('ratgame:fatal', evt => {
  const info = (evt as CustomEvent<{message:string}>).detail;
  errorBox.textContent = info?.message || 'The kitchen could not load.';
  errorBox.classList.remove('is-hidden');
});
window.addEventListener('unhandledrejection', evt => {
  if (ready) return;
  errorBox.textContent = String(evt.reason || 'Loading error');
  errorBox.classList.remove('is-hidden');
});

function playSound(kind: string): void {
  if (mute || mode !== 'playing') return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const start = audio.currentTime;
    const sounds: Record<string, [number, number, number]> = {
      jump: [380, 530, .13], climb: [280, 440, .17],
      eat: [620, 350, .15], steal: [330, 720, .27], hide: [230, 180, .13],
      pop: [290, 450, .14], win: [520, 850, .35], alarm: [250, 170, .28],
      caught: [340, 130, .46],
    };
    const [from, to, duration] = sounds[kind] || sounds.pop;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = kind === 'alarm' || kind === 'caught' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(.035, start);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(start); osc.stop(start + duration);
  } catch { /* Sound is optional on restricted browsers. */ }
}
window.addEventListener('ratgame:sound', e => {
  playSound((e as CustomEvent<{kind:string}>).detail.kind);
});

// Reliable multitouch: holding LEFT while pressing JUMP doesn't release movement.
const heldReset: Array<() => void> = [];
const recentTap: Record<'left'|'right', number> = { left: 0, right: 0 };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
  const dir = button.dataset.hold as 'left' | 'right';
  const pointers = new Set<number>();
  let sprintPointer = -1;
  function release(event: PointerEvent): void {
    pointers.delete(event.pointerId);
    if (event.pointerId === sprintPointer) {
      sprintPointer = -1; setVirtualControl('boost', false);
    }
    setVirtualControl(dir, pointers.size > 0);
    button.classList.toggle('down', pointers.size > 0);
  }
  button.addEventListener('pointerdown', event => {
    if (mode !== 'playing') return;
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    pointers.add(event.pointerId); setVirtualControl(dir, true);
    const now = performance.now();
    if (now - recentTap[dir] < 320) {
      sprintPointer = event.pointerId;
      setVirtualControl('boost', true);
      button.classList.add('boosting');
    }
    recentTap[dir] = now;
    button.classList.add('down');
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture'] as const)
    button.addEventListener(type, release);
  heldReset.push(() => {
    pointers.clear(); sprintPointer = -1; button.classList.remove('down','boosting');
    setVirtualControl(dir, false); setVirtualControl('boost', false);
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tap]')) {
  const act = () => {
    if (mode !== 'playing') return;
    if (button.dataset.tap === 'jump') scene().virtualJump();
    else scene().virtualInteract();
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (mode !== 'playing') return;
    try { button.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    button.classList.add('down'); act();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture'])
    button.addEventListener(type, () => button.classList.remove('down'));
  button.addEventListener('click', event => { if (event.detail === 0) act(); });
}
function releaseAll(): void { heldReset.forEach(f => f()); releaseVirtualControls(); }
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
window.addEventListener('keydown', e => {
  if (mode === 'playing' && ['ArrowLeft','ArrowRight','ArrowUp',' ','Space'].includes(e.key)) e.preventDefault();
}, { passive: false });

const debug = new URLSearchParams(location.search).has('debug');
if (debug) {
  const fps = ui('fps-debug'); fps.hidden = false;
  let counter = 0, last = performance.now();
  const frame = (now: number) => {
    counter++;
    if (now - last > 1000) {
      fps.textContent = Math.round(counter * 1000 / (now - last)) + ' FPS';
      counter = 0; last = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
setTimeout(() => {
  if (!ready) {
    errorBox.textContent = 'This kitchen failed to load. Please refresh or open the browser Console.';
    errorBox.classList.remove('is-hidden');
  }
}, 12000);
