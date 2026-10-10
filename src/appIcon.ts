// The app icon, from its Icon Composer source in the app repo
// (crates/app/icons/Magnitide.icon): the mark's four slabs, layered as
// icon.json lists them, on the background it gives for each appearance. Read
// at build time, so the site's icon follows the app's without exporting
// anything.
import icon from '@app-icons/Magnitide.icon/icon.json';

// Each layer's SVG, by file name. They share one box: the mark, with room
// around it, as the icon is drawn.
const assets = import.meta.glob<string>('@app-icons/Magnitide.icon/Assets/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const byName = Object.fromEntries(Object.entries(assets).map(([path, svg]) => [path.split('/').pop()!, svg]));

/** Icon Composer's "srgb:r,g,b,a" (0–1) as CSS. */
function colour(value: string): string {
  const [r, g, b, a] = value
    .replace(/^srgb:/, '')
    .split(',')
    .map(Number);
  return `rgb(${[r, g, b].map((c) => Math.round(c! * 255)).join(' ')} / ${a})`;
}

const fills = icon['fill-specializations'];
const light = fills.find((f) => !f.appearance);
const dark = fills.find((f) => f.appearance === 'dark');
if (!light || !dark) throw new Error('Magnitide.icon/icon.json: expected a light and a dark fill');

const layers = icon.groups.flatMap((g) => g.layers.map((l) => l['image-name']));
const missing = layers.filter((name) => !byName[name]);
if (missing.length) throw new Error(`Magnitide.icon/Assets: no ${missing.join(', ')}`);

export const appIcon = {
  /** The layers' shared box. */
  viewBox: byName[layers[0]!]!.match(/viewBox="([^"]+)"/)![1]!,
  /** The slabs, bottom layer first, as SVG markup. */
  slabs: layers.map((name) => byName[name]!.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')).join(''),
  /** The background, light and dark. */
  light: colour(light.value.solid),
  dark: colour(dark.value.solid),
};
