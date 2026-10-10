#!/usr/bin/env python3
"""Build the demo library the site's screenshots are taken from.

    scripts/demo-library.py [path-to-app-repo]       default: ../magnitide

Downloads the mock's books (the Standard Ebooks editions in fetch-covers.py)
as EPUBs, once, into <app>/target/demo-library/epubs, then makes a Magnitide
library from them, "My Library", at /Users/Shared/My Library (afresh each
time; screenshots show its path, so not one under your home folder), with the
app's add_books example, and gives the books the
mock's titles, authors, series, years, tags, ratings and shelves
(data/books.js, read with node) with its apply_metadata example, so the
screenshots show the same library as the mock. The EPUBs are under the app
repo's target/, which git ignores.
"""

import importlib.util
import json
import shutil
import subprocess
import tempfile
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIBRARY = Path('/Users/Shared/My Library')
spec = importlib.util.spec_from_file_location('covers', HERE / 'fetch-covers.py')
covers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(covers)


def main() -> None:
    app = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / 'magnitide').resolve()
    if not (app / 'crates/core/examples/add_books.rs').is_file():
        sys.exit(f'no add_books example under {app} (pass the app repo path)')
    base = app / 'target/demo-library'
    epubs = base / 'epubs'
    epubs.mkdir(parents=True, exist_ok=True)
    files = []
    for book, edition in covers.EDITIONS.items():
        name = edition.replace('/', '_') + '.epub'
        file = epubs / name
        if not file.exists():
            # ?source=download skips the thank-you page in front of the file.
            url = f'{covers.SE}{edition}/downloads/{name}?source=download'
            with urllib.request.urlopen(urllib.request.Request(url, headers=covers.HEADERS), timeout=60) as r:
                file.write_bytes(r.read())
            print(f'{book:>2} {file.stat().st_size // 1024:>5} KB  {name}')
            time.sleep(1)
        files.append(str(file))

    library = LIBRARY
    shutil.rmtree(library, ignore_errors=True)
    example = ['cargo', 'run', '--quiet', '--release', '-p', 'magnitide-core', '--example']
    subprocess.run([*example, 'add_books', '--', str(library), '--name', 'My Library', *files], cwd=app, check=True)

    books = subprocess.run(
        ['node', '-e', 'globalThis.window = {}; require(process.argv[1]); console.log(JSON.stringify(window.MOCK_LIBRARY.books))',
         str(HERE.parent / 'data/books.js')],
        capture_output=True, text=True, check=True,
    ).stdout
    with tempfile.NamedTemporaryFile('w', suffix='.json') as f:
        json.dump(json.loads(books), f)
        f.flush()
        subprocess.run([*example, 'apply_metadata', '--', str(library), f.name], cwd=app, check=True)
    print(library)


if __name__ == '__main__':
    main()
