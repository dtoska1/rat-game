export type Control =
  | 'left'
  | 'right'
  | 'jump'
  | 'up'
  | 'space'
  | 'act'
  | 'boost';
const mapping: Record<string, Control> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  Space: 'space',
  KeyE: 'act',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
};
export class Controls {
  private held = new Map<string, Control>();
  private edges = new Set<Control>();
  enabled = false;
  constructor() {
    window.addEventListener('keydown', (e) => {
      const name = mapping[e.code];
      if (!name || !this.enabled || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (!e.repeat) this.press(e.code, name);
    });
    window.addEventListener('keyup', (e) => this.release(e.code));
    window.addEventListener('blur', () => this.clear());
    const releasePointer = (e: PointerEvent) => this.release('p' + e.pointerId);
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-control]'
    )) {
      const name = button.dataset.control as Control;
      button.onpointerdown = (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.press('p' + e.pointerId, name);
        if (button.setPointerCapture) {
          try {
            button.setPointerCapture(e.pointerId);
          } catch {
            /* Window-level release still clears this pointer. */
          }
        }
      };
      button.onlostpointercapture = releasePointer;
    }
  }
  down(c: Control) {
    for (const name of this.held.values()) if (name === c) return true;
    return false;
  }
  direction() {
    let direction = 0;
    for (const control of this.held.values()) {
      if (control === 'left') direction = -1;
      if (control === 'right') direction = 1;
    }
    return direction;
  }
  take(c: Control) {
    return this.edges.delete(c);
  }
  private press(id: string, c: Control) {
    if (!this.down(c)) this.edges.add(c);
    this.held.set(id, c);
    document.querySelector('[data-control="' + c + '"]')?.classList.add('held');
  }
  private release(id: string) {
    const c = this.held.get(id);
    this.held.delete(id);
    if (c && !this.down(c))
      document
        .querySelector('[data-control="' + c + '"]')
        ?.classList.remove('held');
  }
  clear() {
    this.held.clear();
    this.edges.clear();
    document
      .querySelectorAll('.held')
      .forEach((b) => b.classList.remove('held'));
  }
  names() {
    return [...new Set(this.held.values())];
  }
}
