import Phaser from 'phaser';
import './style.css';
import { GameScene, type Mode } from './v3/scene';
import { Controls } from './v3/controls';
import { Sound } from './v3/sound';
import { HEIGHT, stations } from './v3/level';
import ending from './v3/art/ending.webp?url';
import happy from './v3/art/rat-idle.webp?url';

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
function write(node: HTMLElement, value: string) {
  if (node.textContent !== value) node.textContent = value;
}
const stage = el('stage'),
  poster = el('poster'),
  hud = el('hud'),
  thumbs = el('thumbs'),
  start = el<HTMLButtonElement>('start');
const dialog = el<HTMLDialogElement>('guide'),
  sound = new Sound(),
  controls = new Controls();
const touch = matchMedia('(any-pointer: coarse)'),
  energy = el('energy-text'),
  fill = el('energy-fill'),
  notice = el('notice'),
  chefStatus = el('chef-status');
const debug = el('debug'),
  action = el('act'),
  stash = el('stash-count');
const hasTouchControls = () => touch.matches || navigator.maxTouchPoints > 0;
const loot = Array.from(document.querySelectorAll<HTMLElement>('[data-loot]'));
const BEST_SCORE_KEY = 'rat-game-v3-best-score';
function bestScore(): number {
  try { return Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0; }
  catch { return 0; }
}
function recordBest(score: number) {
  if (score <= bestScore()) return false;
  try { localStorage.setItem(BEST_SCORE_KEY, String(score)); return true; }
  catch { return false; }
}
let notebookSignature = '';
const chefWords = {
  patrol: 'Chef on patrol',
  suspicious: 'Chef spotted you',
  investigate: 'Chef investigating',
  search: 'Chef searching',
  chase: 'Chef in pursuit!',
};
let previous: Mode | undefined;
const scene = new GameScene(controls, sound, refresh);
function refresh() {
  const { mode, rat, chef, pantry } = scene;
  if (previous !== mode) {
    stage.dataset.mode = mode;
    document.documentElement.dataset.gameMode = mode;
    poster.hidden = mode !== 'title';
    hud.hidden = mode !== 'play' && mode !== 'caught';
    thumbs.hidden = !hasTouchControls() || mode !== 'play';
    el('outcome').hidden = !['lost', 'won', 'pause'].includes(mode);
    if (mode === 'title') {
      start.disabled = false;
      write(start, 'Start heist   →');
    }
    if (mode === 'pause' || mode === 'lost' || mode === 'won') {
      const lost = mode === 'lost',
        won = mode === 'won';
      write(
        el('end-kicker'),
        lost ? 'Today’s special' : won ? 'Home, sweet home' : 'Kitchen break'
      );
      write(
        el('end-title'),
        lost ? (scene.failureReason === 'alarm' ? 'Chef’s alarm!' : 'Rat à la mode') : won ? 'A full pantry!' : 'Heist paused'
      );
      const result = scene.score();
      el('score-board').hidden = !won;
      if (won) {
        const newBest = recordBest(result.points);
        write(el('score-board'), result.rank + ' · ' + result.points.toLocaleString() +
          ' points · ' + result.duration + 's · ' + result.challenges + '/3 notebook' +
          (newBest ? ' · NEW PERSONAL BEST!' : ''));
      }
      write(
        el('end-copy'),
        lost
          ? scene.failureReason === 'alarm'
            ? 'The kitchen alarm rang before you escaped. Find the exit faster next time!'
            : 'The chef has baked you into his signature cake. At least the ears are flattering.'
          : won
            ? 'Three pastries, three cheeses and two kitchen pranks! Check your score and try for GOLD.'
            : 'Your rat will wait right here.'
      );
      write(
        el('end-action'),
        mode === 'pause' ? 'Back to the heist' : 'Play again  →'
      );
      const art = el('ending-art');
      art.replaceChildren();
      if (mode !== 'pause') {
        const img = new Image();
        img.src = lost ? ending : happy;
        img.alt = '';
        art.append(img);
      }
      el('restart').hidden = mode !== 'pause';
      el('end-action').focus({ preventScroll: true });
    }
    previous = mode;
  }
  if (mode === 'play') {
    const squeak = el<HTMLButtonElement>('squeak');
    const ready = pantry.squeakCooldown <= 0 && rat.energy >= 8 && rat.hidden !== 'Home';
    squeak.disabled = !ready;
    write(squeak, pantry.squeakCooldown > 0 ? Math.ceil(pantry.squeakCooldown) + 's' : 'Squeak');
    const pct = Math.floor(rat.energy);
    write(energy, pct + '%');
    if (fill.style.width !== pct + '%') fill.style.width = pct + '%';
    write(chefStatus, chefWords[chef.mode] + (pantry.phase === 'cheese' ? ' · ALERT' : ''));
    chefStatus.classList.toggle('danger', chef.mode === 'chase');
    const message =
      pantry.messageTime > 0
        ? pantry.message
        : pantry.phase === 'cheese'
          ? pantry.cheeseFound.size === 3 && pantry.gadgetsUsed.size >= 2
            ? 'All missions done · escape home →'
            : 'Cheese ' + pantry.cheeseFound.size + '/3 · pranks ' + pantry.gadgetsUsed.size + '/2 · dodge the mop!'
        : rat.hidden && rat.hidden !== 'Home'
          ? 'Hidden · ' + rat.hidden
          : rat.carried
            ? 'Carrying ' + rat.carried.name + '   ·   Home →'
            : rat.energy === 100
              ? 'Full belly · look for a whole pastry'
              : rat.x > 2740
                ? '← Pastry tables'
                : rat.y > 450 &&
                    stations.some((s) => Math.abs(rat.x - s.x) < 300)
                  ? hasTouchControls()
                    ? 'Jump onto the stool · tap Jump again at the ladder'
                    : 'Space / ↑ to jump onto the stool · hold ↑ at the ladder'
                  : '';
    write(notice, message);
    notice.hidden = !message;
    const choice = pantry.choose(rat);
    const short = {
      emerge: 'Leave',
      deliver: 'Stash',
      steal: 'Take',
      sample: 'Taste',
      hide: 'Hide',
      clang: 'Clang',
      hungry: 'Action',
      collect: 'Pocket',
      gadget: 'Prank!',
      finish: 'Win!',
      none: 'Action',
    };
    write(action, short[choice.action]);
  }
  const notes = pantry.notebook.tasks;
  const signature = notes.map((n) => n.id + ':' + Number(pantry.notebook.done.has(n.id))).join('|');
  if (notebookSignature !== signature) {
    notebookSignature = signature;
    const board = el('note-tasks');
    board.replaceChildren(...notes.map((task) => {
      const item = document.createElement('li');
      const done = pantry.notebook.done.has(task.id);
      item.className = done ? 'done' : '';
      item.textContent = (done ? '✓ ' : '○ ') + task.label;
      return item;
    }));
  }
  write(el('notebook-progress'), pantry.notebook.completed + ' / 3 pranks');
  write(el('notebook-compact'), 'To-do ' + pantry.notebook.completed + '/3');
  write(el('guide-notebook'), notes.map((n) => (pantry.notebook.done.has(n.id) ? '✓ ' : '○ ') + n.label).join(' · '));
  const clock = el('escape-timer');
  clock.hidden = !pantry.escapeActive || mode !== 'play';
  if (pantry.escapeActive) write(clock, '⏰ Escape home: ' + Math.ceil(pantry.escapeLeft) + 's');
  write(el('best-score'), bestScore() ? 'Personal best: ' + bestScore().toLocaleString() : 'New: 3 random pranks each run');
  write(stash, pantry.delivered.size + ' of 3 pastries');
  write(
    el('short-stash'),
    pantry.phase === 'cheese'
      ? (pantry.escapeActive ? 'ESCAPE ' + Math.ceil(pantry.escapeLeft) + 's' : 'Secret cheese ' + pantry.cheeseFound.size + ' / 3')
      : 'Home stash ' + pantry.delivered.size + ' / 3'
  );
  el('cheese-mission').hidden = pantry.phase !== 'cheese' && mode !== 'won';
  write(el('cheese-progress'), pantry.cheeseFound.size + ' / 3 found');
  write(el('prank-progress'), pantry.gadgetsUsed.size + ' / 2 sabotaged');
  el('bonus-hud').hidden = pantry.phase !== 'cheese' || mode !== 'play';
  write(el('bonus-cheese'), 'Cheese ' + pantry.cheeseFound.size + '/3');
  write(el('bonus-gadgets'), 'Pranks ' + pantry.gadgetsUsed.size + '/2');
  write(el('bonus-mop'), pantry.mopDisabled > 0 ? 'Mop sleeping' : 'Jump the mop!');
  write(el('notebook-bonus'), 'Mischief ' + pantry.notebook.completed + '/3');
  loot.forEach((n) => {
    const done = pantry.delivered.has(
      n.dataset.loot as (typeof stations)[number]['kind']
    );
    n.classList.toggle('stored', done);
    write(n.querySelector('i')!, done ? '✓' : '○');
  });
  if (scene.debug && mode === 'play') {
    debug.hidden = false;
    write(
      debug,
      Math.round(scene.game.loop.actualFps) +
        ' fps · ' +
        scene.game.loop.rawDelta.toFixed(1) +
        ' ms/frame\n' +
        controls.names().join(' + ')
    );
  } else debug.hidden = true;
}
function measureView() {
  const width = Math.max(1, stage.clientWidth),
    height = Math.max(1, stage.clientHeight);
  // A 3× iPhone canvas was redrawing nearly three million pixels per frame.
  // Prefer crisp 2× artwork, but fit the backing store into a mobile-safe budget.
  const density = Math.min(
    window.devicePixelRatio || 1,
    hasTouchControls() ? 2 : 1.75,
    Math.sqrt(1500000 / (width * height))
  );
  const landscapePhone =
    hasTouchControls() &&
    matchMedia('(orientation: landscape) and (max-height: 600px)').matches;
  return {
    width: Math.round(width * density),
    height: Math.round(height * density),
    visibleHeight: landscapePhone
      ? Phaser.Math.Clamp(height / 1.05, 254, 375)
      : HEIGHT,
  };
}
// iOS Safari can still pinch-zoom even when the viewport disables scaling.
// Ignore browser zoom gestures during play without interfering with game taps.
const preventPlayZoom = (event: Event) => {
  if (hasTouchControls() && scene.mode === 'play' && event.cancelable) {
    event.preventDefault();
  }
};
document.addEventListener('gesturestart', preventPlayZoom, { passive: false });
document.addEventListener('gesturechange', preventPlayZoom, { passive: false });
document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) preventPlayZoom(event);
  },
  { passive: false }
);
document.addEventListener('dblclick', preventPlayZoom);
document.documentElement.classList.toggle('touch-game', hasTouchControls());
const initialView = measureView();
scene.visibleHeight = initialView.visibleHeight;
// AUTO prefers GPU-accelerated WebGL and falls back to Canvas if unavailable.
// ?renderer=canvas remains available for troubleshooting older devices.
const renderer =
  new URLSearchParams(location.search).get('renderer') === 'canvas'
    ? Phaser.CANVAS
    : Phaser.AUTO;
const game = new Phaser.Game({
  type: renderer,
  parent: 'world',
  width: initialView.width,
  height: initialView.height,
  backgroundColor: '#f1cc9b',
  scene: [scene],
  scale: { mode: Phaser.Scale.NONE },
  render: {
    antialias: true,
    roundPixels: false, // preserve subpixel smoothness while the camera moves
    powerPreference: 'high-performance',
  },
  // Explicit limit matters on 120 Hz iPhones: target alone does not cap updates.
  fps: { target: 60, limit: 60, forceSetTimeOut: false },
  audio: { noAudio: true },
  banner: false,
});
const fit = () => {
  if (!game.scale.canvas) return;
  const view = measureView();
  scene.visibleHeight = view.visibleHeight;
  if (view.width !== game.scale.width || view.height !== game.scale.height) {
    game.scale.resize(view.width, view.height);
  }
};
new ResizeObserver(fit).observe(stage);
window.addEventListener('resize', fit);
game.events.once(Phaser.Core.Events.READY, fit);
touch.addEventListener('change', () => {
  document.documentElement.classList.toggle('touch-game', hasTouchControls());
  thumbs.hidden = !hasTouchControls() || scene.mode !== 'play';
  fit();
});
start.onclick = () => scene.start();
el('pause').onclick = () => scene.pause();
el('end-action').onclick = () =>
  scene.mode === 'pause' ? scene.pause() : scene.start();
el('restart').onclick = () => scene.start();
function soundLabel() {
  write(el('sound'), sound.muted ? '♪  Sound off' : '♫  Sound on');
  el('sound').setAttribute('aria-pressed', String(!sound.muted));
}
soundLabel();
el('sound').onclick = () => {
  sound.toggle();
  soundLabel();
};
let resumeOnClose = false;
el('guide-open').onclick = () => {
  resumeOnClose = scene.mode === 'play';
  if (resumeOnClose) scene.pause();
  dialog.showModal();
};
el('guide-close').onclick = el('guide-done').onclick = () => dialog.close();
dialog.addEventListener('close', () => {
  if (resumeOnClose && scene.mode === 'pause') scene.pause();
  resumeOnClose = false;
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !dialog.open && !e.repeat) {
    e.preventDefault();
    scene.pause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && scene.mode === 'play') scene.pause();
});
if (scene.debug) {
  Object.defineProperty(window, 'ratPlaytest', {
    value: Object.freeze({
      read: () => scene.snapshot(),
      timing: () => scene.timing(),
      renderer: () =>
        game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
    }),
  });
}
