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
        lost ? 'Rat à la mode' : won ? 'A full pantry!' : 'Heist paused'
      );
      write(
        el('end-copy'),
        lost
          ? 'The chef has baked you into his signature cake. At least the ears are flattering.'
          : won
            ? 'Three pastries safely stashed. Somewhere, a French chef is counting to ten.'
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
    const pct = Math.floor(rat.energy);
    write(energy, pct + '%');
    if (fill.style.width !== pct + '%') fill.style.width = pct + '%';
    write(chefStatus, chefWords[chef.mode]);
    chefStatus.classList.toggle('danger', chef.mode === 'chase');
    const message =
      pantry.messageTime > 0
        ? pantry.message
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
      none: 'Action',
    };
    write(action, short[choice.action]);
  }
  write(stash, pantry.delivered.size + ' of 3 pastries');
  write(el('short-stash'), 'Home stash ' + pantry.delivered.size + ' / 3');
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
  const density = Math.min(
    window.devicePixelRatio || 1,
    3,
    Math.sqrt(3200000 / (width * height))
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
const renderer =
  new URLSearchParams(location.search).get('renderer') === 'webgl'
    ? Phaser.AUTO
    : Phaser.CANVAS;
const game = new Phaser.Game({
  type: renderer,
  parent: 'world',
  width: initialView.width,
  height: initialView.height,
  backgroundColor: '#f1cc9b',
  scene: [scene],
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: true, roundPixels: true, powerPreference: 'low-power' },
  fps: { target: 60, forceSetTimeOut: false },
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
