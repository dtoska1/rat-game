import Phaser from 'phaser';
import './style.css';
import { GameScene, type Mode } from './v3/scene';
import { Controls } from './v3/controls';
import { Sound } from './v3/sound';
import { HEIGHT, stations } from './v3/level';
import ending from './v3/art/ending.webp?url';
import happy from './v3/art/rat-idle.webp?url';
import drawing2 from './v3/art/gallery/drawing-2.svg?url';
import kitchenSketch from './v3/art/gallery/kitchen-sketch.svg?url';

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
function write(node: HTMLElement, value: string) {
  if (node.textContent !== value) node.textContent = value;
}
const stage = el('stage'),
  poster = el('poster'),
  hud = el('hud'),
  thumbs = el('thumbs'),
  start = el<HTMLButtonElement>('start'),
  chaosStart = el<HTMLButtonElement>('start-chaos');
const dialog = el<HTMLDialogElement>('guide'),
  artDialog = el<HTMLDialogElement>('art-gallery'),
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
const SWAPPED_HANDS_KEY = 'rat-game-v3-swapped-hands';
const swapHands = el<HTMLButtonElement>('swap-hands');
let swappedHands = false;
try { swappedHands = localStorage.getItem(SWAPPED_HANDS_KEY) === 'yes'; }
catch { /* Private browsing may block storage. */ }
function setSwappedHands(swapped: boolean) {
  swappedHands = swapped;
  thumbs.classList.toggle('swapped', swapped);
  swapHands.setAttribute('aria-pressed', String(swapped));
  write(swapHands, swapped ? '⇄ Back' : '⇄ Swap');
  swapHands.title = swapped ? 'Return to default hand layout' : 'Swap left and right hand controls';
  controls.clear(); // Never preserve a held direction after moving buttons.
}
setSwappedHands(swappedHands);
swapHands.onclick = () => {
  setSwappedHands(!swappedHands);
  try { localStorage.setItem(SWAPPED_HANDS_KEY, swappedHands ? 'yes' : 'no'); }
  catch { /* The preference still works until reload. */ }
};
// Phone gameplay requires landscape (either landscape orientation).
// Browsers generally cannot force device rotation; show a clear rotation
// screen in portrait. Rotation pauses and resumes without restarting the run.
// Automated legacy portrait viewport tests may bypass this gate via an
// injected, non-public pre-navigation flag.
const testWindow = window as Window & { __ratPlaytestBypassOrientationGate?: boolean };
const landscapeGate = el('landscape-gate');
const uprightPhone = () =>
  hasTouchControls() &&
  window.innerHeight >= window.innerWidth &&
  testWindow.__ratPlaytestBypassOrientationGate !== true;
let pausedByRotation = false;
function syncLandscapeGate() {
  const blocked = uprightPhone();
  landscapeGate.hidden = !blocked;
  document.documentElement.classList.toggle('landscape-blocked', blocked);
  if (blocked) {
    controls.clear();
    if (scene.mode === 'play') {
      pausedByRotation = true;
      scene.pause();
    }
  } else if (pausedByRotation) {
    pausedByRotation = false;
    if (scene.mode === 'pause') scene.pause();
  }
}
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
const scene = new GameScene(controls, sound, refresh, openArtwork);
type GalleryArtwork = 'drawing2' | 'sketch';
const artwork = {
  drawing2: {
    src: drawing2, title: 'k🫶🏼 — featured original',
    description: 'Your priority artwork: the cat, car, characters, sun, clouds and handwritten details, preserved from the actual PDF.',
    source: 'k🫶🏼 · Original artwork', alt: 'Full original artwork k🫶🏼',
  },
  sketch: {
    src: kitchenSketch, title: 'Original Rat Game kitchen sketch',
    description: 'The hand-drawn kitchen idea: three windows and curtains, cake and éclair table, rat, chef and house.',
    source: 'Source: rat game sketch.pdf', alt: 'Full original kitchen sketch',
  },
};
let resumeAfterGallery = false;
function chooseArtwork(which: GalleryArtwork) {
  const item = artwork[which];
  const photo = el<HTMLImageElement>('gallery-image');
  photo.src = item.src;
  photo.alt = item.alt;
  write(el('gallery-heading'), item.title);
  write(el('gallery-desc'), item.description);
  write(el('gallery-source'), item.source);
  for (const name of ['drawing2', 'sketch'] as const) {
    const button = el<HTMLButtonElement>(name === 'drawing2'
      ? 'select-drawing2' : 'select-sketch');
    const selected = name === which;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('selected', selected);
  }
  artDialog.dataset.showing = which;
}
function openArtwork(which: GalleryArtwork = 'drawing2') {
  chooseArtwork(which);
  if (artDialog.open) return;
  resumeAfterGallery = scene.mode === 'play';
  if (resumeAfterGallery) scene.pause();
  artDialog.showModal();
}

function refresh() {
  const { mode, rat, chef, pantry } = scene;
  if (previous !== mode) {
    stage.dataset.mode = mode;
    stage.dataset.playStyle = scene.playStyle;
    document.documentElement.dataset.gameMode = mode;
    poster.hidden = mode !== 'title';
    hud.hidden = mode !== 'play' && mode !== 'caught';
    thumbs.hidden = !hasTouchControls() || mode !== 'play';
    el('outcome').hidden = !['lost', 'won', 'pause'].includes(mode);
    if (mode === 'title') {
      start.disabled = false;
      chaosStart.disabled = false;
      write(start, 'Original story →');
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
            ? scene.playStyle === 'chaos'
              ? 'You conquered the instant Chaos Challenge! Try the original story or chase a GOLD medal.'
              : 'Three pastries, three cheeses and two kitchen pranks! Check your score and try for GOLD.'
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
    write(el('mode-ribbon'), scene.playStyle === 'chaos'
      ? '⚡ HARD CHAOS · TWO MOPS + STEAM JETS'
      : 'CLASSIC STORY · CHAOS UNLOCKS AFTER 3 PASTRIES');
    const squeak = el<HTMLButtonElement>('squeak');
    const ready = pantry.squeakCooldown <= 0 && rat.energy >= 8 && rat.hidden !== 'Home';
    squeak.disabled = !ready;
    write(squeak, pantry.squeakCooldown > 0 ? Math.ceil(pantry.squeakCooldown) + 's' : 'Squeak');
    const pct = Math.floor(rat.energy);
    write(energy, pct + '%');
    if (fill.style.width !== pct + '%') fill.style.width = pct + '%';
    write(chefStatus, chefWords[chef.mode] +
      (scene.playStyle === 'chaos' ? ' · FURY ' +
        (pantry.cheeseFound.size + 1) + '/4' :
        pantry.phase === 'cheese' ? ' · ALERT' : ''));
    chefStatus.classList.toggle('danger', chef.mode === 'chase');
    const message =
      pantry.messageTime > 0
        ? pantry.message
        : pantry.phase === 'cheese'
          ? pantry.cheeseFound.size === 3 && pantry.gadgetsUsed.size >= 2
            ? 'All missions done · escape home →'
            : scene.playStyle === 'chaos'
              ? 'HARD: cheese ' + pantry.cheeseFound.size + '/3 · switches ' +
                pantry.gadgetsUsed.size + '/2 · dodge steam + TWO mops!'
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
    const readyToAct = choice.action !== 'none' && choice.action !== 'hungry';
    action.classList.toggle('ready-to-act', readyToAct);
    const actionDescription = readyToAct
      ? short[choice.action] + ' nearby object'
      : 'Action: approach an interactive object';
    if (action.getAttribute('aria-label') !== actionDescription)
      action.setAttribute('aria-label', actionDescription);
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
  write(stash, scene.playStyle === 'chaos'
    ? 'Pastry missions skipped · Hard Chaos'
    : pantry.delivered.size + ' of 3 pastries');
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
  write(el('bonus-mop'), pantry.mopDisabled > 0
    ? scene.playStyle === 'chaos' ? 'Both mops sleeping!' : 'Mop sleeping'
    : scene.playStyle === 'chaos' ? 'TWO mops: jump or switch off!' : 'Jump the mop!');
  write(el('chaos-pressure'), scene.playStyle === 'chaos'
    ? 'Steam: amber = warning, red = HOT!'
    : 'Bonus mission');
  write(el('notebook-bonus'), 'Mischief ' + pantry.notebook.completed + '/3');
  loot.forEach((n) => {
    const done = pantry.delivered.has(
      n.dataset.loot as (typeof stations)[number]['kind']
    );
    n.classList.toggle('stored', done && scene.playStyle !== 'chaos');
    n.classList.toggle('skipped', scene.playStyle === 'chaos');
    write(n.querySelector('i')!, scene.playStyle === 'chaos' ? '–' : done ? '✓' : '○');
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
  // Keep the HTML HUD sharp while reducing the much more expensive WebGL
  // backing buffer on a phone. This is ~1M pixels in a large iPhone landscape,
  // not the 3M+ pixel native Retina canvas that previously caused stalls.
  const requestedQuality = new URLSearchParams(location.search).get('quality');
  const mobileDensity = requestedQuality === 'low' ? 1.2 : 1.75;
  const density = Math.min(
    window.devicePixelRatio || 1,
    hasTouchControls() ? mobileDensity : 1.75,
    Math.sqrt((hasTouchControls() ? 1150000 : 1500000) / (width * height))
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
  // Match the display's native requestAnimationFrame cadence. The old fixed
  // 60-FPS limiter skipped refreshes on ProMotion screens, creating visible
  // pacing steps while scrolling. Physics stays deterministic at 120Hz.
  fps: { target: 60, limit: 0, forceSetTimeOut: false },
  audio: { noAudio: true },
  banner: false,
});
const fit = () => {
  if (!game.scale.canvas) return;
  const view = measureView();
  scene.visibleHeight = view.visibleHeight;
  // Avoid expensive GPU buffer reallocations on a 1–2px toolbar nudge.
  if (Math.abs(view.width - game.scale.width) > 3 ||
      Math.abs(view.height - game.scale.height) > 3) {
    game.scale.resize(view.width, view.height);
  }
};
let fitTimer: number | undefined;
const scheduleFit = () => {
  // Safari animates the address bar and sends many viewport/ResizeObserver
  // events in a short burst. Wait for the dimensions to settle, rather than
  // snapping the camera and resizing the WebGL drawing buffer every frame.
  if (fitTimer !== undefined) window.clearTimeout(fitTimer);
  fitTimer = window.setTimeout(() => {
    fitTimer = undefined;
    fit();
  }, 140);
};
new ResizeObserver(scheduleFit).observe(stage);
window.addEventListener('resize', scheduleFit, { passive: true });
window.visualViewport?.addEventListener('resize', scheduleFit, { passive: true });
// React to both phone rotations, including the return from landscape.
window.addEventListener('resize', syncLandscapeGate, { passive: true });
window.addEventListener('orientationchange', syncLandscapeGate, { passive: true });
window.visualViewport?.addEventListener('resize', syncLandscapeGate, { passive: true });
game.events.once(Phaser.Core.Events.READY, fit);
touch.addEventListener('change', () => {
  document.documentElement.classList.toggle('touch-game', hasTouchControls());
  thumbs.hidden = !hasTouchControls() || scene.mode !== 'play';
  scheduleFit();
  syncLandscapeGate();
});
syncLandscapeGate();
// Starting/pausing changes whether the touch deck and mast are visible.
// Those deliberate layout changes need a synchronous re-fit; only incidental
// Safari browser-chrome resizes are debounced.
start.onclick = () => { if (uprightPhone()) return; scene.start('classic'); fit(); };
chaosStart.onclick = () => { if (uprightPhone()) return; scene.start('chaos'); fit(); };
el('pause').onclick = () => { scene.pause(); fit(); };
el('end-action').onclick = () => {
  if (uprightPhone()) return;
  if (scene.mode === 'pause') scene.pause();
  else scene.start(scene.playStyle);
  fit();
};
el('restart').onclick = () => { if (uprightPhone()) return; scene.start(scene.playStyle); fit(); };
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
el('gallery-open').onclick = () => openArtwork('drawing2');
el('gallery-in-game').onclick = () => openArtwork('drawing2');
el('title-art').onclick = () => openArtwork('drawing2');
el('show-featured').onclick = () => openArtwork('drawing2');
el('show-sketch').onclick = () => openArtwork('sketch');
el('select-drawing2').onclick = () => chooseArtwork('drawing2');
el('select-sketch').onclick = () => chooseArtwork('sketch');
el('gallery-close').onclick = el('gallery-done').onclick = () => artDialog.close();
artDialog.addEventListener('close', () => {
  if (resumeAfterGallery && scene.mode === 'pause') scene.pause();
  resumeAfterGallery = false;
});
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
  if (e.code === 'Escape' && !dialog.open && !artDialog.open && !e.repeat) {
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
      originalArtworkLoaded: () => ({
        drawing: game.textures.exists('original-drawing2'),
        sketch: game.textures.exists('original-kitchen-sketch'),
      }),
    }),
  });
}
