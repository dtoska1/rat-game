import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Bounds refer to a 600-unit proof of each transparent sheet.
const cast = [
  ['rat-idle', 12, 16, 173, 150],
  ['rat-walk', 213, 16, 178, 151],
  ['rat-jump', 405, 8, 185, 158],
  ['chef-walk', 33, 178, 149, 208],
  ['chef-search', 202, 195, 189, 190],
  ['chef-chase', 400, 174, 197, 208],
  ['chef-bake', 5, 388, 191, 205],
  ['ending', 198, 399, 193, 192],
  ['rat-eat', 403, 414, 191, 173],
];
const props = [
  ['table', 7, 76, 212, 108],
  ['stool', 234, 57, 133, 138],
  ['ladder', 442, 25, 99, 181],
  ['home', 12, 244, 185, 138],
  ['pot', 197, 223, 205, 160],
  ['spoon', 406, 212, 183, 174],
  ['eclair', 10, 448, 192, 105],
  ['macaron', 223, 433, 153, 127],
  ['cake', 404, 400, 173, 179],
];
const out = 'src/v3/art';
const poses = [
  ['rat-scared', 40, 18, 242, 258],
  ['rat-climb', 326, 17, 239, 279],
  ['rat-carry', 20, 320, 260, 256],
  ['rat-hide', 340, 385, 240, 183],
];
const frames = {};
const layers = [];
let index = 0;
for (const [sheet, boxes] of [
  ['cast', cast],
  ['props', props],
  ['rat-poses', poses],
  ['furniture', [
    ['sack',12,23,280,281], ['crate',320,22,259,280],
    ['lilac-table',1,352,298,216], ['mint-table',304,348,293,219]
  ]],
]) {
  for (const [name, x, y, w, h] of boxes) {
    const scale = 1254 / 600;
    const tile = await sharp('art-source/v3/' + sheet + '.webp')
      .extract({
        left: Math.round(x * scale),
        top: Math.round(y * scale),
        width: Math.round(w * scale),
        height: Math.round(h * scale),
      })
      .png()
      .toBuffer();
    const { data, info } = await sharp(tile)
      .trim({ threshold: 10 })
      .resize({
        width: 316,
        height: 316,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = (index % 5) * 320 + 2,
      top = Math.floor(index / 5) * 320 + 2;
    layers.push({ input: data, left, top });
    frames[name] = {
      frame: { x: left, y: top, w: info.width, h: info.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: info.width, h: info.height },
      sourceSize: { w: info.width, h: info.height },
    };
    if (
      [
        'rat-idle',
        'rat-jump',
        'chef-chase',
        'ending',
        'cake',
        'eclair',
        'macaron',
      ].includes(name)
    ) {
      await sharp(data)
        .webp({ quality: 90 })
        .toFile(out + '/' + name + '.webp');
    }
    index++;
  }
}
const atlasHeight = Math.ceil(index / 5) * 320;
await sharp({
  create: {
    width: 1600,
    height: atlasHeight,
    channels: 4,
    background: '#00000000',
  },
})
  .composite(layers)
  .webp({ quality: 78 })
  .toFile(out + '/kitchen-atlas.webp');
await writeFile(
  out + '/kitchen-atlas.json',
  JSON.stringify({
    frames,
    meta: { size: { w: 1600, h: atlasHeight }, scale: '1' },
  })
);
await sharp('art-source/v3/wall.webp')
  .resize(2048)
  .webp({ quality: 88 })
  .toFile(out + '/wall.webp');
