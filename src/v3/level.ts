export const WORLD = 3280;
export const HEIGHT = 600;
export const FLOOR = 530;
export const HOME = 3100;
export const SPOON = 2060;
export const POT = 1830;
export const containers = [
  { name: 'Teapot', frame: 'pot', x: POT, width: 160, height: 115, radius: 56 },
  {
    name: 'Flour sack',
    frame: 'sack',
    x: 1040,
    width: 115,
    height: 107,
    radius: 49,
  },
  {
    name: 'Pastry crate',
    frame: 'crate',
    x: 2874,
    width: 126,
    height: 96,
    radius: 51,
  },
];
export type Pastry = 'eclair' | 'macaron' | 'cake';
export type Station = {
  kind: Pastry;
  name: string;
  x: number;
  top: number;
  width: number;
  gain: number;
  weight: number;
};
export const stations: Station[] = [
  {
    kind: 'eclair',
    name: 'Éclair',
    x: 2410,
    top: 371,
    width: 350,
    gain: 24,
    weight: 0.77,
  },
  {
    kind: 'macaron',
    name: 'Macaron',
    x: 1430,
    top: 332,
    width: 380,
    gain: 17,
    weight: 0.85,
  },
  {
    kind: 'cake',
    name: 'Strawberry cake',
    x: 520,
    top: 300,
    width: 400,
    gain: 37,
    weight: 0.7,
  },
];
export const rack = (s: Station) => s.x + s.width / 2 - 10;
export const stool = (s: Station) => rack(s) + 66;
export const sampleX = (s: Station) => s.x + 48;
export const pastryX = (s: Station) => s.x - 84;
export const STOOL_Y = FLOOR - 82;
export interface Slab {
  left: number;
  right: number;
  top: number;
  thick: number;
  oneWay?: boolean;
}
export const slabs: Slab[] = stations.flatMap((s) => [
  { left: s.x - s.width / 2, right: s.x + s.width / 2, top: s.top, thick: 20 },
  {
    left: stool(s) - 71,
    right: stool(s) + 71,
    top: STOOL_Y,
    thick: 10,
    oneWay: true,
  },
]);
export const hideouts = [
  { name: 'Home', x: HOME, radius: 68 },
  ...containers,
  ...stations.map((s) => ({
    name: 'Tablecloth',
    x: s.x,
    radius: s.width * 0.32,
  })),
];
export function coverAt(x: number, y: number) {
  return y >= FLOOR - 12
    ? hideouts.find((h) => Math.abs(x - h.x) < h.radius)
    : undefined;
}
export function reachable(x: number, y: number, targetX: number, top: number) {
  return Math.abs(x - targetX) < 43 && Math.abs(y - top) < 9;
}
// The chef looks from his face to the rat's centre; a tabletop or teapot can break that ray.
export function blocksSight(x1: number, y1: number, x2: number, y2: number) {
  function hits(left: number, right: number, top: number, bottom: number) {
    const dx = x2 - x1;
    if (Math.abs(dx) < 0.01)
      return (
        x1 >= left &&
        x1 <= right &&
        Math.max(y1, y2) >= top &&
        Math.min(y1, y2) <= bottom
      );
    const enter = Math.max(0, Math.min((left - x1) / dx, (right - x1) / dx));
    const exit = Math.min(1, Math.max((left - x1) / dx, (right - x1) / dx));
    if (enter > exit) return false;
    const a = y1 + (y2 - y1) * enter,
      b = y1 + (y2 - y1) * exit;
    return Math.max(a, b) >= top && Math.min(a, b) <= bottom;
  }
  return (
    slabs.some((s) => hits(s.left, s.right, s.top, s.top + s.thick)) ||
    containers.some((p) =>
      hits(p.x - p.radius + 9, p.x + p.radius - 9, FLOOR - p.height + 16, FLOOR)
    )
  );
}
