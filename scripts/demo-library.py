#!/usr/bin/env python3
"""Build the demo library the site's screenshots are taken from.

    scripts/demo-library.py [path-to-app-repo]       default: ../magnitide

Downloads the books in scripts/demo-books.json (public-domain classics, by
their Standard Ebooks editions) as EPUBs, once, into
<app>/target/demo-library/epubs, then makes a Magnitide library from them,
"My Library", at /Users/Shared/My Library (afresh each time; screenshots show
its path, so not one under your home folder), with the app's add_books
example, and gives the books the titles, authors, series, tags, ratings and
shelves in demo-books.json with its apply_metadata example, then the dates
they were added and published (YYYY-MM-DD, or YYYY-MM or YYYY where that's
all that's known). The
EPUBs are under the app repo's target/, which git ignores. Standard Ebooks
dedicates its editions to the public domain (CC0).
"""

import json
import shutil
import sqlite3
import subprocess
import tempfile
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIBRARY = Path('/Users/Shared/My Library')
BOOKS = json.loads((HERE / 'demo-books.json').read_text())
SE = 'https://standardebooks.org/ebooks/'
HEADERS = {'User-Agent': 'magnitide-site demo library (https://magnitide.com)'}


def main() -> None:
    app = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / 'magnitide').resolve()
    if not (app / 'crates/core/examples/add_books.rs').is_file():
        sys.exit(f'no add_books example under {app} (pass the app repo path)')
    base = app / 'target/demo-library'
    epubs = base / 'epubs'
    epubs.mkdir(parents=True, exist_ok=True)
    files = []
    for book in BOOKS:
        edition = book['edition']
        name = edition.replace('/', '_') + '.epub'
        file = epubs / name
        if not file.exists():
            # ?source=download skips the thank-you page in front of the file.
            url = f'{SE}{edition}/downloads/{name}?source=download'
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
                file.write_bytes(r.read())
            print(f'{book["id"]:>2} {file.stat().st_size // 1024:>5} KB  {name}')
            time.sleep(1)
        files.append(str(file))

    library = LIBRARY
    shutil.rmtree(library, ignore_errors=True)
    example = ['cargo', 'run', '--quiet', '--release', '-p', 'magnitide-core', '--example']
    subprocess.run([*example, 'add_books', '--', str(library), '--name', 'My Library', *files], cwd=app, check=True)

    with tempfile.NamedTemporaryFile('w', suffix='.json') as f:
        # apply_metadata takes a year; the full date goes in below.
        json.dump([{**b, 'published': int(str(b['published'])[:4])} for b in BOOKS], f)
        f.flush()
        subprocess.run([*example, 'apply_metadata', '--', str(library), f.name], cwd=app, check=True)

    # What the core has no setter for, straight into the database: when each
    # book was added (a minute apart, in the file's order, so books added the
    # same day still sort), and publication dates more precise than a year.
    db = sqlite3.connect(library / 'magnitide.db')
    with db:
        for i, b in enumerate(BOOKS):
            added = f'{b["added"]}T09:{i:02}:00Z'
            published = str(b['published'])
            published += '-01-01'[len(published) - 4:] if len(published) < 10 else ''
            db.execute('UPDATE books SET added_at = ?, modified_at = ?, published = ? WHERE title = ?',
                       (added, added, published, b['title']))
    db.close()
    print(library)


if __name__ == '__main__':
    main()
