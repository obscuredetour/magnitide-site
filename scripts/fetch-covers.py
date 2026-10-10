#!/usr/bin/env python3
"""Fetch the mock library's covers from Standard Ebooks.

    scripts/fetch-covers.py

For each book in data/books.js (by id), downloads the cover of its Standard
Ebooks edition, writes covers/<id>.webp (400 px wide, for 2x screens; needs
cwebp: `brew install webp`), and writes data/covers.js with each cover's file,
its edition's page and the painting it's adapted from (from the colophon).

Standard Ebooks dedicates what it produces to the public domain (CC0), and
its covers are paintings it has cleared as public domain in the US. Run this
again to add a book or pick up a new cover; it asks Standard Ebooks for one
book at a time, with a pause between.
"""

import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
SE = 'https://standardebooks.org/ebooks/'
HEADERS = {'User-Agent': 'magnitide-site cover fetch (https://magnitide.com)'}

# Mock book id → its Standard Ebooks edition.
EDITIONS = {
    1: 'jane-austen/pride-and-prejudice',
    2: 'mary-shelley/frankenstein',
    3: 'herman-melville/moby-dick',
    4: 'jules-verne/from-the-earth-to-the-moon/ward-lock-co',
    5: 'jules-verne/around-the-world-in-eighty-days/george-makepeace-towle',
    6: 'h-g-wells/the-war-of-the-worlds',
    7: 'h-g-wells/the-time-machine',
    8: 'arthur-conan-doyle/a-study-in-scarlet',
    9: 'arthur-conan-doyle/the-hound-of-the-baskervilles',
    10: 'charlotte-bronte/jane-eyre',
    11: 'leo-tolstoy/anna-karenina/constance-garnett',
    12: 'fyodor-dostoevsky/crime-and-punishment/constance-garnett',
    13: 'oscar-wilde/the-picture-of-dorian-gray',
    14: 'lewis-carroll/alices-adventures-in-wonderland/john-tenniel',
    15: 'bram-stoker/dracula',
    16: 'mark-twain/the-adventures-of-huckleberry-finn',
    17: 'virginia-woolf/mrs-dalloway',
    18: 'alexandre-dumas/the-count-of-monte-cristo/chapman-and-hall',
}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as r:
        return r.read()


def painting(edition: str) -> str | None:
    """The colophon's sentence on the cover: 'The cover page is adapted from …'."""
    try:
        page = get(f'{SE}{edition}/text/colophon').decode('utf-8')
    except OSError:
        return None
    text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', page)))
    # The sentence runs to the next one ("The cover and title pages feature…");
    # a full stop alone could be an initial (J. M. W. Turner).
    m = re.search(r'The cover page is adapted from (.+?\.) The ', text)
    return m.group(1) if m else None


def main() -> None:
    if not shutil.which('cwebp'):
        sys.exit('needs cwebp (brew install webp)')
    out = SITE / 'covers'
    out.mkdir(exist_ok=True)
    covers = {}
    with tempfile.TemporaryDirectory() as tmp:
        for book, edition in EDITIONS.items():
            jpg = Path(tmp) / f'{book}.jpg'
            try:
                jpg.write_bytes(get(f'{SE}{edition}/downloads/cover.jpg'))
            except urllib.error.HTTPError as err:
                # A page for an edition that isn't out yet (still under copyright) has no cover.
                print(f'{book:>2}  no cover ({err.code}): {SE}{edition}; it keeps a generated one')
                continue
            webp = out / f'{book}.webp'
            subprocess.run(['cwebp', '-quiet', '-q', '72', '-resize', '400', '0', str(jpg), '-o', str(webp)], check=True)
            covers[book] = {'file': f'covers/{book}.webp', 'source': f'{SE}{edition}', 'painting': painting(edition)}
            print(f'{book:>2} {webp.stat().st_size // 1024:>3} KB  {edition}')
            time.sleep(1)
    (SITE / 'data/covers.js').write_text(
        '// Written by scripts/fetch-covers.py: each mock book\'s cover, from its Standard\n'
        '// Ebooks edition (CC0; the paintings are public domain in the US).\n'
        f'window.MOCK_COVERS = {json.dumps(covers, indent=2, ensure_ascii=False)};\n'
    )
    print(f'wrote data/covers.js ({len(covers)} covers)')


if __name__ == '__main__':
    main()
