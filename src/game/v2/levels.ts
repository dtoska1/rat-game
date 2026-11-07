export type RoomId = 'kitchen' | 'pantry';
export type FoodKind = 'cake' | 'eclair' | 'macaron' | 'cheese';

export interface FoodSpawn {
  id: string;
  kind: FoodKind;
  x: number;
  y: number;
}

export interface PlatformSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClimbSpot {
  x: number;
  top: number;
  bottom: number;
}

export interface HideSpot {
  x: number;
  radius: number;
  name: string;
}

export interface RoomSpec {
  id: RoomId;
  title: string;
  chefStartX: number;
  patrolMin: number;
  patrolMax: number;
  homeX?: number;
  exitX: number;
  exitTo: RoomId;
  exitSpawnX: number;
  exitLabel: string;
  platforms: readonly PlatformSpec[];
  climbs: readonly ClimbSpot[];
  hides: readonly HideSpot[];
  foods: readonly FoodSpawn[];
}

export const FOOD: Record<FoodKind, { label: string; energy: number; points: number }> = {
  cake: { label: 'Cake', energy: 38, points: 50 },
  eclair: { label: 'Eclair', energy: 25, points: 35 },
  macaron: { label: 'Macaron', energy: 18, points: 25 },
  cheese: { label: 'Cheese', energy: 12, points: 15 },
};

export const GOAL = 3;
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 680;
export const FLOOR_Y = 605;

export const ROOMS: Record<RoomId, RoomSpec> = {
  kitchen: {
    id: 'kitchen',
    title: 'The Kitchen',
    chefStartX: 235,
    patrolMin: 170,
    patrolMax: 750,
    homeX: 1510,
    exitX: 74,
    exitTo: 'pantry',
    exitSpawnX: 1490,
    exitLabel: 'PANTRY',
    platforms: [
      { x: 800, y: 627, width: 1600, height: 44 },
      { x: 350, y: 399, width: 492, height: 18 },
      { x: 902, y: 357, width: 262, height: 15 },
      { x: 857, y: 461, width: 240, height: 18 },
      { x: 1308, y: 271, width: 190, height: 14 },
      { x: 636, y: 503, width: 90, height: 15 },
    ],
    climbs: [
      { x: 148, top: 390, bottom: 607 },
      { x: 558, top: 390, bottom: 607 },
      { x: 776, top: 348, bottom: 607 },
      { x: 1017, top: 348, bottom: 607 },
      { x: 1228, top: 261, bottom: 606 },
    ],
    hides: [
      { x: 1510, radius: 105, name: 'your rat hole' },
      { x: 895, radius: 90, name: 'the cupboard' },
      { x: 1310, radius: 96, name: 'the fridge' },
      { x: 345, radius: 110, name: 'under the table' },
    ],
    foods: [
      { id: 'k-cake-1', kind: 'cake', x: 185, y: 363 },
      { id: 'k-eclair-1', kind: 'eclair', x: 287, y: 362 },
      { id: 'k-mac-1', kind: 'macaron', x: 385, y: 363 },
      { id: 'k-cake-2', kind: 'cake', x: 480, y: 363 },
      { id: 'k-eclair-2', kind: 'eclair', x: 562, y: 363 },
      { id: 'k-cheese-1', kind: 'cheese', x: 705, y: 304 },
      { id: 'k-mac-2', kind: 'macaron', x: 789, y: 306 },
      { id: 'k-eclair-3', kind: 'eclair', x: 875, y: 427 },
      { id: 'k-cake-3', kind: 'cake', x: 964, y: 428 },
      { id: 'k-cheese-2', kind: 'cheese', x: 1179, y: 563 },
      { id: 'k-mac-3', kind: 'macaron', x: 1370, y: 561 },
    ],
  },
  pantry: {
    id: 'pantry',
    title: 'The Suspicious Pantry',
    chefStartX: 1250,
    patrolMin: 760,
    patrolMax: 1420,
    exitX: 1530,
    exitTo: 'kitchen',
    exitSpawnX: 135,
    exitLabel: 'KITCHEN',
    platforms: [
      { x: 800, y: 627, width: 1600, height: 44 },
      { x: 320, y: 415, width: 400, height: 18 },
      { x: 850, y: 348, width: 385, height: 18 },
      { x: 1290, y: 450, width: 285, height: 18 },
      { x: 633, y: 516, width: 105, height: 16 },
    ],
    climbs: [
      { x: 142, top: 403, bottom: 607 },
      { x: 502, top: 403, bottom: 607 },
      { x: 666, top: 336, bottom: 607 },
      { x: 1030, top: 336, bottom: 607 },
      { x: 1158, top: 438, bottom: 607 },
      { x: 1410, top: 438, bottom: 607 },
    ],
    hides: [
      { x: 410, radius: 112, name: 'a flour sack' },
      { x: 900, radius: 100, name: 'behind the jars' },
      { x: 1350, radius: 100, name: 'the pantry cabinet' },
    ],
    foods: [
      { id: 'p-cheese-1', kind: 'cheese', x: 211, y: 379 },
      { id: 'p-mac-1', kind: 'macaron', x: 298, y: 382 },
      { id: 'p-cake-1', kind: 'cake', x: 422, y: 383 },
      { id: 'p-eclair-1', kind: 'eclair', x: 720, y: 310 },
      { id: 'p-mac-2', kind: 'macaron', x: 815, y: 309 },
      { id: 'p-cake-2', kind: 'cake', x: 948, y: 310 },
      { id: 'p-cheese-2', kind: 'cheese', x: 1260, y: 415 },
      { id: 'p-eclair-2', kind: 'eclair', x: 1353, y: 416 },
      { id: 'p-mac-3', kind: 'macaron', x: 580, y: 568 },
      { id: 'p-cheese-3', kind: 'cheese', x: 1060, y: 567 },
    ],
  },
};
