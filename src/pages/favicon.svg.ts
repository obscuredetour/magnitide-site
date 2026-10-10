import type { APIRoute } from 'astro';
import { appIcon } from '../appIcon';

// The tab icon: the app icon as an SVG, on its dark background when the
// browser is dark. (A favicon can't see the theme chosen on the page, but the
// browser's own appearance is what its tab bar follows.) Rounded as the nav's
// is, a quarter of its side.
export const GET: APIRoute = () => {
  const [x, y, width, height] = appIcon.viewBox.split(' ').map(Number) as [number, number, number, number];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${appIcon.viewBox}">
<style>.bg { fill: ${appIcon.light} } @media (prefers-color-scheme: dark) { .bg { fill: ${appIcon.dark} } }</style>
<rect class="bg" x="${x}" y="${y}" width="${width}" height="${height}" rx="${width / 4}"/>
${appIcon.slabs}
</svg>
`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
