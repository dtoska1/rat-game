export type Control = 'left' | 'right' | 'jump' | 'climb' | 'act' | 'boost';
const mapping: Record<string, Control> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'climb',
  KeyW: 'climb',
  Space: 'jump',
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
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-control]'
    )) {
      const name = button.dataset.control as Control;
      button.onpointerdown = (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.press('p' + e.pointerId, name);
      };
      const release = (e: PointerEvent) => this.release('p' + e.pointerId);
      button.onpointerup =
        button.onpointercancel =
        button.onlostpointercapture =
          release;
    }
  }
  down(c: Control) {
    for (const name of this.held.values()) if (name === c) return true;
    return false;
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
