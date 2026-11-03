import Phaser from 'phaser';
import { KitchenScene, releaseVirtualControls, setVirtualControl } from './game/KitchenScene';
import './style.css';

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
const game = new Phaser.Game({
  // Canvas is more reliable for our simple 2D art on older / restricted GPUs.
  type: Phaser.CANVAS,
  parent: 'game',
  width: 1100,
  height: 680,
  backgroundColor: '#ffe5d7',
  render: { antialias: true, pixelArt: false },
  physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 1120 } } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
});

const dialog = document.getElementById('dialog')!;
const dialogIcon = document.getElementById('dialog-icon')!;
const dialogKicker = document.getElementById('dialog-kicker')!;
const dialogTitle = document.getElementById('dialog-title')!;
const dialogDescription = document.getElementById('dialog-description')!;
const actionButton = document.getElementById('action-button') as HTMLButtonElement;
let dialogMode: 'intro' | 'paused' | 'won' | 'lost' = 'intro';

interface DialogData { mode: typeof dialogMode; icon: string; kicker: string; title: string; description: string; button: string }
function showDialog(data: DialogData): void {
  dialogMode = data.mode;
  dialogIcon.textContent = data.icon;
  dialogKicker.textContent = data.kicker;
  dialogTitle.textContent = data.title;
  dialogDescription.textContent = data.description;
  actionButton.textContent = data.button;
  dialog.classList.remove('is-hidden');
  if (data.mode !== 'intro' && data.mode !== 'paused') releaseVirtualControls();
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
  releaseVirtualControls();
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
document.getElementById('restart-btn')!.addEventListener('click', restart);

document.getElementById('how-to-btn')!.addEventListener('click', () => {
  document.getElementById('instructions')!.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Optional touch / mouse on-screen controls; normal keyboard controls work on desktop.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
  const control = button.dataset.hold as 'left' | 'right' | 'up' | 'boost';
  const press = (event: PointerEvent) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setVirtualControl(control, true);
    button.classList.add('pressed');
  };
  const release = (event: PointerEvent) => {
    event.preventDefault();
    setVirtualControl(control, false);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => { setVirtualControl(control, false); button.classList.remove('pressed'); });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tap]')) {
  button.addEventListener('click', () => {
    if (!dialog.classList.contains('is-hidden')) return;
    const s = currentScene();
    const action = button.dataset.tap;
    if (action === 'jump') s.virtualJump();
    else if (action === 'interact') s.virtualInteract();
    else if (action === 'hide') s.virtualHide();
  });
}

// Prevent arrows / Space from scrolling the page during gameplay.
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(event.key) &&
      dialog.classList.contains('is-hidden')) event.preventDefault();
}, { passive: false });
window.addEventListener('blur', releaseVirtualControls);
