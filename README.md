# magnitide.com

The landing site for [Magnitide](https://github.com/obscuredetour/magnitide), served by GitHub Pages at https://magnitide.com.

An [Astro](https://astro.build) site styled with [Tailwind CSS](https://tailwindcss.com) v4. Its colours are the app's own theme files, read from a checkout of the app repo, so the site and the app never drift: switching theme on the site switches the same themes the app has.

## Editing

You need Node 22 or later and [pnpm](https://pnpm.io), and a checkout of the app repo next to this one (`../magnitide`), or set `MAGNITIDE_APP` to wherever it is.

```bash
pnpm install
pnpm dev                       # http://localhost:4321, reloads as you edit
```

`pnpm build` writes the published site to `dist/` (`pnpm preview` serves it), and `pnpm check` type-checks and checks formatting (`pnpm format` fixes the formatting).

### Where things are

```
src/pages/index.astro          the front page
src/pages/plugins.astro        plugins.html
src/layouts/Base.astro         every page's <head>, nav and footer
src/components/                the pieces pages are made of: Section, Card, Fact, Button, Pill, Hero,
                               Screenshots, Downloads, ThemeMenu, Nav, Footer, Icon
src/styles/global.css          Tailwind, the app's themes, and the few base styles
src/themes.ts                  the app's themes and their accents, for the theme menu
src/appIcon.ts                 the app icon, light and dark, from the app's Icon Composer file (nav, favicon)
public/                        copied as is: screenshots/, CNAME
```

Most edits are text in the two pages. Styling is Tailwind utilities on the elements, using the same colour names as the app (`bg-panel`, `text-muted`, `border-line`, `bg-accent`…): only theme colours exist, so everything follows the theme. `dark:` means the chosen theme is a dark one. Icons are [Lucide](https://lucide.dev), as in the app: import one from `@lucide/astro` and use `<Icon of={Puzzle} />`.

When the app adds a theme, add it to `src/themes.ts`; its colours come from the app's CSS by themselves.

## Screenshots

`public/screenshots/{light,dark}-{grid,list,details,browse,edit,settings,plugins}.webp` are the real app, taken on macOS with a demo library of public-domain books from [Standard Ebooks](https://standardebooks.org). To take them again (after a UI change, say):

```bash
scripts/demo-library.py    # once, or when scripts/demo-books.json changes: a demo library at /Users/Shared/My Library
scripts/screenshots.py     # with `cargo tauri dev` running in ../magnitide; keep its window in front
```

`demo-library.py` downloads the books in `scripts/demo-books.json` as EPUBs and builds the library with the app repo's `add_books` and `apply_metadata` examples, giving the books the tags, series, ratings and shelves listed there, then sets when each was added and first published straight in its database (the core has no setter for those). `screenshots.py` runs `scripts/screenshots/tour.js` inside the dev app (it relaunches, opens the demo library, shows each view in Light and Dark, then puts back the library and every setting it touched), captures the window and keeps the views that hold still. The Plugins view's list of installed plugins is the tour's own (`PLUGINS` in tour.js), not this computer's. It checks first that the screen can be captured: a locked screen stops it halfway.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: it checks out the app repo's `main` for the theme CSS and icons, runs `pnpm build`, and publishes `dist/` to Pages. Run the workflow by hand (Actions → Pages → Run workflow) after the app's themes change.

While the app repo is private the workflow needs a repository secret `APP_REPO_TOKEN`: a fine-grained personal access token with **Contents: read** on `obscuredetour/magnitide`. Once that repo is public the `token:` line in the workflow and the secret can go.
