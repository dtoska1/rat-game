import Phaser from 'phaser';
import { KitchenScene, releaseVirtualControls, setVirtualControl } from './game/KitchenScene';
import './style.css';
import './mobile-controls.css';

// A visible diagnostic replaces the confusing all-pink screen if setup fails.
const startupError = document.getElementById('startup-error')!;
let sceneReady = false;
const showStartupError = (message: string): void => {
  if (sceneReady) return;
  startupError.textContent = `The kitchen failed to load: ${message}. Open Chrome DevTools → Console and copy the red error if it still fails.`;
  startupError.classList.remove('is-hidden');
};
window.addEventListener('error', (event) => showStartupError(event.message || 'JavaScript error'));
window.addEventListener('unhandledrejection', (event) => showStartupError(String(event.reason || 'Promise rejection')));
window.addEventListener('ratgame:fatal', (event) => showStartupError(String((event as CustomEvent<string>).detail)));
window.addEventListener('ratgame:ready', () => {
  sceneReady = true;
  startupError.classList.add('is-hidden');
});
window.setTimeout(() => {
  if (!sceneReady) showStartupError('The game scene did not initialize within 8 seconds');
}, 8000);

const scene = new KitchenScene();
const gameContainer = document.getElementById('game')!;
const game = new Phaser.Game({
  // Canvas is more reliable for our simple 2D art on older / restricted GPUs.
  type: Phaser.CANVAS,
  parent: 'game',
  width: Math.max(320, gameContainer.clientWidth),
  height: Math.max(280, gameContainer.clientHeight),
  backgroundColor: '#ffe5d7',
  render: { antialias: true, pixelArt: false },
  physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 1120 } } },
  // Resize the world to fit a phone screen rather than shrinking the entire desktop room.
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [scene],
});

const dialog = document.getElementById('dialog')!;
const dialogIcon = document.getElementById('dialog-icon')!;
const dialogKicker = document.getElementById('dialog-kicker')!;
const dialogTitle = document.getElementById('dialog-title')!;
const dialogDescription = document.getElementById('dialog-description')!;
const actionButton = document.getElementById('action-button') as HTMLButtonElement;
const restartDialogButton = document.getElementById('restart-dialog-btn') as HTMLButtonElement;
type DialogMode = 'intro' | 'paused' | 'won' | 'lost';
let dialogMode: DialogMode = 'intro';

interface DialogData { mode: DialogMode; icon: string; kicker: string; title: string; description: string; button: string }
function showDialog(data: DialogData): void {
  dialogMode = data.mode;
  dialogIcon.textContent = data.icon;
  dialogKicker.textContent = data.kicker;
  dialogTitle.textContent = data.title;
  dialogDescription.textContent = data.description;
  actionButton.textContent = data.button;
  restartDialogButton.hidden = data.mode !== 'paused';
  dialog.classList.remove('is-hidden');
  if (data.mode !== 'intro' && data.mode !== 'paused') resetAllControls();
}
function hideDialog(): void { dialog.classList.add('is-hidden'); }
function currentScene(): KitchenScene { return game.scene.getScene('KitchenScene') as KitchenScene; }

window.addEventListener('ratgame:dialog', (event) => {
  showDialog((event as CustomEvent<DialogData>).detail);
});
window.addEventListener('ratgame:pause-request', pauseToggle);

function pauseToggle(): void {
  if (dialogMode === 'won' || dialogMode === 'lost') return;
  if (dialogMode === 'paused') {
    dialogMode = 'intro';
    hideDialog();
    game.scene.resume('KitchenScene');
    return;
  }
  if (!dialog.classList.contains('is-hidden')) return;
  game.scene.pause('KitchenScene');
  showDialog({ mode: 'paused', icon: '🐀', kicker: 'THE RAT IS THINKING', title: 'PAUSED.',
    description: 'The chef is also frozen in time. Do not tell him.', button: 'RESUME CHAOS' });
}

function restart(): void {
  resetAllControls();
  // Clear any button that was still held when the previous round ended.
  document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((button) => {
    button.classList.remove('pressed');
  });
  dialogMode = 'intro';
  hideDialog();

  // Wait for this scene's own ready signal, instead of guessing that the
  // first global POST_STEP means its controls and physics are initialized.
  // Register BEFORE starting so a synchronous create() can't be missed.
  window.addEventListener('ratgame:ready', () => currentScene().startPlaying(), { once: true });
  game.scene.stop('KitchenScene');
  game.scene.start('KitchenScene');
}

actionButton.addEventListener('click', () => {
  if (dialogMode === 'paused') { pauseToggle(); return; }
  if (dialogMode === 'won' || dialogMode === 'lost') { restart(); return; }
  hideDialog();
  currentScene().startPlaying();
});

document.getElementById('pause-btn')!.addEventListener('click', pauseToggle);
document.getElementById('pause-mobile-btn')!.addEventListener('click', pauseToggle);
restartDialogButton.addEventListener('click', restart);
document.getElementById('restart-btn')!.addEventListener('click', restart);

document.getElementById('how-to-btn')!.addEventListener('click', () => {
  document.getElementById('instructions')!.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Multi-touch: each pointer is independent; movement + jumping/boost work together.
const heldControls: Array<() => void> = [];
const gameIsActive = (): boolean => dialog.classList.contains('is-hidden');
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
  const control = button.dataset.hold as 'left' | 'right' | 'up' | 'boost';
  const pointers = new Set<number>();
  const reset = () => {
    pointers.clear();
    setVirtualControl(control, false);
    button.classList.remove('pressed');
  };
  heldControls.push(reset);
  button.addEventListener('pointerdown', (event: PointerEvent) => {
    if (!gameIsActive()) return;
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { /* capture unavailable */ }
    pointers.add(event.pointerId);
    setVirtualControl(control, true);
    button.classList.add('pressed');
  });
  const release = (event: PointerEvent) => {
    event.preventDefault();
    pointers.delete(event.pointerId);
    const held = pointers.size > 0;
    setVirtualControl(control, held);
    button.classList.toggle('pressed', held);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tap]')) {
  const act = () => {
    if (!gameIsActive()) return;
    const scene = currentScene();
    switch (button.dataset.tap) {
      case 'jump': scene.virtualJump(); break;
      case 'interact': scene.virtualInteract(); break;
      case 'hide': scene.virtualHide(); break;
    }
  };
  button.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { /* capture unavailable */ }
    button.classList.add('pressed');
    act();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, () => button.classList.remove('pressed'));
  }
  // Pointerdown prevents synthetic clicks; keep keyboard activation.
  button.addEventListener('click', (event: MouseEvent) => { if (event.detail === 0) act(); });
}

const fullscreenButton = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const fullscreenTarget = document.getElementById('game-shell')!;
if (!document.fullscreenEnabled || !fullscreenTarget.requestFullscreen) fullscreenButton.hidden = true;
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await fullscreenTarget.requestFullscreen();
  } catch (error) { console.info('Fullscreen unavailable:', error); }
});
const mobileHint = document.getElementById('rotate-tip');
document.getElementById('dismiss-rotate-tip')?.addEventListener('click', () => mobileHint?.classList.add('is-dismissed'));
function resetAllControls(): void {
  heldControls.forEach(reset => reset());
  releaseVirtualControls();
}
// Prevent arrows / Space from scrolling the page during gameplay.
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(event.key) &&
      dialog.classList.contains('is-hidden')) event.preventDefault();
}, { passive: false });
window.addEventListener('blur', resetAllControls);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetAllControls(); });
