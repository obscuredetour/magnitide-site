# magnitide.com

The landing site for [Magnitide](https://github.com/obscuredetour/magnitide), served by GitHub Pages at https://magnitide.com.

Plain HTML, CSS and JavaScript, no build tooling. The interactive window on the front page is a mock of Magnitide's main window; its colours come from the app's real theme files, taken from a checkout of the app repo so the themes never drift.

## Editing

```bash
./serve.py                     # or ./serve.py path/to/magnitide (default: ../magnitide)
```

Then open http://localhost:8080 and edit. `serve.py` serves the pages, CSS and JS straight from this repo and the theme CSS and icons straight from the app checkout, so there's nothing to build. Saving a file updates open pages: a stylesheet is swapped in place (the page keeps its scroll and state), anything else reloads. That includes the app's theme files, so a theme change shows up here too. Python 3, standard library only.

To check exactly what will be published, build `dist/` and serve that instead:

```bash
./build.sh ../magnitide
python3 -m http.server -d dist 8080
```

## Covers

The mock's books are public-domain classics with their [Standard Ebooks](https://standardebooks.org) covers: `covers/<id>.webp`, with each cover's edition and painting in `data/covers.js`. Standard Ebooks dedicates its editions to the public domain (CC0), and its cover paintings are public domain in the US. `scripts/fetch-covers.py` fetches them again (it needs `cwebp`: `brew install webp`); to add a book, give it an id in `data/books.js` and its Standard Ebooks edition in the script's `EDITIONS`.

## Screenshots

`screenshots/{light,dark}-{browse,edit,settings}.webp` are the real app, taken on macOS with the same books as the mock. To take them again (after a UI change, say):

```bash
scripts/demo-library.py    # once, or when data/books.js changes: a demo library at /Users/Shared/My Library
scripts/screenshots.py     # with `cargo tauri dev` running in ../magnitide; keep its window in front
```

`demo-library.py` downloads the Standard Ebooks EPUBs and builds the library with the app repo's `add_books` and `apply_metadata` examples, giving the books the mock's tags, series, ratings and shelves. `screenshots.py` runs `scripts/screenshots/tour.js` inside the dev app (it relaunches, opens the demo library, shows each view in Light and Dark, then puts back the library and every setting it touched), captures the window and keeps the views that hold still. It checks first that the screen can be captured: a locked screen stops it halfway.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: it checks out the app repo's `main` for the theme CSS and icons, runs `build.sh`, and publishes `dist/` to Pages. Run the workflow by hand (Actions → Pages → Run workflow) after the app's themes change.

While the app repo is private the workflow needs a repository secret `APP_REPO_TOKEN`: a fine-grained personal access token with **Contents: read** on `obscuredetour/magnitide`. Once that repo is public the `token:` line in the workflow and the secret can go.
