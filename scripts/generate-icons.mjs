/**
 * Generates the app icons procedurally: Pip the Packet zooming along a little
 * network. Run with `npm run icons` after changing the design.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const BG = '#2563eb';
const INK = '#1e2a4a';

function iconSvg({ padding }) {
  const s = 512;
  const inner = s - padding * 2;
  // Network nodes in a triangle, scaled into the safe area.
  const p = (x, y) => [padding + x * inner, padding + y * inner];
  const nodes = [p(0.2, 0.25), p(0.8, 0.25), p(0.5, 0.82)];
  const colors = ['#f97316', '#22c55e', '#facc15'];
  const lines = [
    [0, 1],
    [1, 2],
    [2, 0],
  ]
    .map(
      ([a, b]) =>
        `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="${INK}" stroke-width="${inner * 0.06}" stroke-linecap="round"/>`,
    )
    .join('');
  const dots = nodes
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${inner * 0.12}" fill="${colors[i]}" stroke="${INK}" stroke-width="${inner * 0.03}"/>`,
    )
    .join('');
  const [px, py] = p(0.5, 0.42);
  const k = inner / 330;
  const pip = `<g transform="translate(${px} ${py}) scale(${k})">
    <rect x="-46" y="-30" width="92" height="66" rx="14" fill="#38bdf8" stroke="${INK}" stroke-width="5"/>
    <path d="M-42 -26 L0 6 L42 -26" fill="none" stroke="${INK}" stroke-width="4" opacity="0.35"/>
    <path d="M-24 2 q8 -10 16 0 M8 2 q8 -10 16 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-12 14 q12 16 24 0 z" fill="#7f1d1d" stroke="${INK}" stroke-width="3"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${padding > 60 ? 0 : 112}" fill="${BG}"/>
  ${lines}${dots}${pip}
</svg>`;
}

mkdirSync('public', { recursive: true });
mkdirSync('build', { recursive: true });

const standard = iconSvg({ padding: 40 });
const maskable = iconSvg({ padding: 100 });

writeFileSync('public/favicon.svg', standard);
const render = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);

await Promise.all([
  render(standard, 192, 'public/pwa-192.png'),
  render(standard, 512, 'public/pwa-512.png'),
  render(maskable, 512, 'public/pwa-maskable-512.png'),
  render(standard, 180, 'public/apple-touch-icon.png'),
  render(standard, 1024, 'build/icon.png'),
]);
console.log('Icons written to public/ and build/');
