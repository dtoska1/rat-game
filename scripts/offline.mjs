import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// A self-contained copy can be opened from disk without a server or network.
const { output } = await build({
  base: './',
  build: {
    write: false,
    modulePreload: false,
    assetsInlineLimit: () => true,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
const html = output.find((o) => o.fileName === 'index.html');
const js = output.find((o) => o.type === 'chunk' && o.isEntry);
const css = output.find((o) => o.fileName.endsWith('.css'));
if (!html || !js) throw Error('Preview is missing an entry point.');
let standalone = String(html.source)
  .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/, '')
  .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/, () =>
    css ? '<style>' + css.source + '</style>' : ''
  )
  .replace(
    '</body>',
    () =>
      '<script>' +
      js.code.replace(/<\/script/gi, '<\\/script') +
      '</script></body>'
  );
// V3.6 added two original SVG artworks. A standalone file cannot fetch
// './assets/*.svg' from disk, so inline *all* emitted assets (SVG, PNG, WebP,
// font files, etc.), not just WebP thumbnails.
const mimes = {
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};
for (const file of output.filter((o) => o.type === 'asset' &&
  o.fileName !== 'index.html' && !o.fileName.endsWith('.css'))) {
  const extension = file.fileName.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase();
  const mime = mimes[extension] ?? 'application/octet-stream';
  standalone = standalone.replaceAll(
    './' + file.fileName,
    'data:' + mime + ';base64,' + Buffer.from(file.source).toString('base64')
  );
}
await mkdir('preview', { recursive: true });
const notices = await readFile('public/third-party-notices.txt','utf8');
standalone += '\n<!-- Bundled software and font notices\n' + notices.replaceAll('-->', '-- >') + '\n-->\n';
await writeFile('preview/Rat Game V3.html', standalone);
console.log('Created preview/Rat Game V3.html');
