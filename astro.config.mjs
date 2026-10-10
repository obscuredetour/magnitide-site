// @ts-check
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// The app repo (obscuredetour/magnitide) supplies the theme CSS and the icon,
// so the site's colours are always the app's. Point MAGNITIDE_APP at a
// checkout; CI checks one out at ./app.
const app = resolve(process.env.MAGNITIDE_APP ?? '../magnitide');
if (!existsSync(`${app}/crates/app/ui/src/themes/index.css`)) {
  throw new Error(`No Magnitide checkout at ${app}: set MAGNITIDE_APP to the app repo's path.`);
}

export default defineConfig({
  site: 'https://magnitide.com',
  // index.html and plugins.html, as the site has always had.
  build: { format: 'file' },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@app-themes': `${app}/crates/app/ui/src/themes`,
        '@app-icons': `${app}/crates/app/icons`,
      },
    },
    // The dev server may serve the app checkout's files (it's outside this repo).
    server: { fs: { allow: ['.', app] } },
  },
});
