#!/usr/bin/env python3
"""Take the site's screenshots of the real app, in Light and Dark.

    scripts/screenshots.py [path-to-app-repo]       default: ../magnitide

macOS only. Needs `cargo tauri dev` already running from the app repo (with
its file watcher, the default), the demo library (scripts/demo-library.py),
cwebp (brew install webp), and Screen Recording permission for the terminal.

It installs scripts/screenshots/tour.js as the app's dev hook, which makes the
watcher relaunch the app; the tour then shows each view in turn while this
captures the window, and puts the app back as it was. Frames that hold still
between the tour's two magenta slates are the shots, written to
screenshots/<theme>-<view>.webp (browse, edit, settings). Keep the window in front and uncovered while
it runs (about a minute): macOS stops drawing a covered window.
"""

import glob
import hashlib
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
SHOTS = [f'{t}-{v}' for t in ('light', 'dark') for v in ('browse', 'edit', 'settings')]
HOOK_TAG = '  <script type="module" src="/dev-hook.js"></script>\n'
TOUR_KEY = 'screenshotTourSaved'  # tour.js's snapshot of the app's settings, there while it runs


def tour_running() -> bool | None:
    """Whether the dev app's localStorage holds the tour's snapshot (None: no store found).

    The dev app's store is the newest one under ~/Library/WebKit/magnitide/
    (named for the dev binary) that has a libraryPath; it's read from a copy,
    so the app's own file is never opened.
    """
    stores = sorted(glob.glob(str(Path.home() / 'Library/WebKit/magnitide/WebsiteData/Default/*/*/LocalStorage/localstorage.sqlite3')),
                    key=lambda f: Path(f).stat().st_mtime, reverse=True)
    for store in stores:
        with tempfile.TemporaryDirectory() as tmp:
            for f in glob.glob(store + '*'):
                shutil.copy(f, tmp)
            db = sqlite3.connect(Path(tmp) / Path(store).name)
            keys = {k for (k,) in db.execute('SELECT key FROM ItemTable')}
            db.close()
        if 'libraryPath' in keys:
            return TOUR_KEY in keys
    return None

# The app's largest on-screen window (tooltips are windows of their own).
WINDOW_ID = r'''
import Cocoa
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]
var best: (Int, Double)? = nil
for w in list {
  guard (w[kCGWindowOwnerName as String] as? String ?? "").lowercased().contains("magnitide") else { continue }
  let b = w[kCGWindowBounds as String] as! [String: Any]
  let area = (b["Width"] as! Double) * (b["Height"] as! Double)
  if best == nil || area > best!.1 { best = (w[kCGWindowNumber as String] as! Int, area) }
}
if let b = best { print(b.0) }
'''

# Whether a frame is the tour's magenta slate, by its centre pixel.
IS_SLATE = r'''
import Cocoa
let rep = NSBitmapImageRep(data: NSImage(contentsOfFile: CommandLine.arguments[1])!.tiffRepresentation!)!
// The capture's own colour space: converting magenta to sRGB shifts its green.
let c = rep.colorAt(x: rep.pixelsWide / 2, y: rep.pixelsHigh / 2)!
print(c.redComponent > 0.8 && c.greenComponent < 0.4 && c.blueComponent > 0.8 ? "slate" : "")
'''


def main() -> None:
    app = Path(sys.argv[1] if len(sys.argv) > 1 else SITE.parent / 'magnitide').resolve()
    ui = app / 'crates/app/ui'
    demo = Path('/Users/Shared/My Library')  # as scripts/demo-library.py makes it
    if not (demo / 'magnitide.db').exists():
        sys.exit(f'no demo library at {demo}: run scripts/demo-library.py first')
    if not shutil.which('cwebp'):
        sys.exit('needs cwebp (brew install webp)')

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for name, source in (('winid', WINDOW_ID), ('is-slate', IS_SLATE)):
            (tmp / f'{name}.swift').write_text(source)
            subprocess.run(['swiftc', '-O', str(tmp / f'{name}.swift'), '-o', str(tmp / name)], check=True, capture_output=True)
        window = lambda: subprocess.run([str(tmp / 'winid')], capture_output=True, text=True).stdout.strip()
        is_slate = lambda f: subprocess.run([str(tmp / 'is-slate'), str(f)], capture_output=True, text=True).stdout.strip() == 'slate'
        before = window()
        if not before:
            sys.exit('no Magnitide window: start `cargo tauri dev` in the app repo first')
        # A locked or sleeping screen can't be captured, and pauses the tour halfway; check first.
        if subprocess.run(['screencapture', '-x', '-o', '-l', before, str(tmp / 'check.png')], capture_output=True).returncode:
            sys.exit('can\'t capture the window (is the screen locked, or Screen Recording off for this terminal?)')
        if tour_running():
            print('A tour was cut short before; this one starts by putting its settings back.')

        index = ui / 'index.html'
        html = index.read_text()
        frames = []
        try:
            (ui / 'dev-hook.js').write_text((SITE / 'scripts/screenshots/tour.js').read_text().replace('__DEMO__', str(demo)))
            if HOOK_TAG not in html:
                index.write_text(html.replace('</body>', HOOK_TAG + '</body>', 1))
            print('Installed the tour; waiting for the app to relaunch. Keep its window in front.')
            deadline = time.time() + 120
            while window() in ('', before):
                if time.time() > deadline:
                    sys.exit('the app didn\'t relaunch: is `cargo tauri dev` running with its watcher?')
                time.sleep(0.5)
            slates, deadline = 0, time.time() + 150
            last = None
            while time.time() < deadline:
                frame = tmp / f'f{len(frames):04}.png'
                if subprocess.run(['screencapture', '-x', '-o', '-l', window(), str(frame)], capture_output=True).returncode == 0:
                    slate = is_slate(frame)
                    if slate and last is not True:
                        slates += 1
                    last = slate
                    frames.append((frame, slate))
                    if slates == 2 and not slate:
                        break
                time.sleep(0.5)
        finally:
            # Only once the tour has put the app's settings back (its snapshot gone).
            deadline = time.time() + 300
            while tour_running() and time.time() < deadline:
                time.sleep(1)
            (ui / 'dev-hook.js').unlink(missing_ok=True)
            index.write_text(html)
            if tour_running():
                print('Removed the tour before it finished: run this again, and it starts by putting the app\'s settings back.')
            else:
                print('Removed the tour; the app is as it was.')

        # Between the slates, runs of identical frames (1.5 s or more) are the shots, in order.
        marks = [i for i, (_, slate) in enumerate(frames) if slate]
        if not marks:
            debug = SITE / 'screenshots' / 'unsorted'
            debug.mkdir(parents=True, exist_ok=True)
            for frame, _ in frames[:: max(1, len(frames) // 12)]:
                shutil.copy(frame, debug / frame.name)
            sys.exit(f'never saw the tour start ({len(frames)} frames; a sample is in {debug}): was the window covered?')
        first_end = next((i for i in marks if i + 1 not in marks), marks[-1])
        second = next((i for i in marks if i > first_end), len(frames))
        runs = []
        for frame, _ in frames[first_end + 1 : second]:
            digest = hashlib.md5(frame.read_bytes()).hexdigest()
            if runs and runs[-1][0] == digest:
                runs[-1][1].append(frame)
            else:
                runs.append((digest, [frame]))
        shots = [frames for _, frames in runs if len(frames) >= 3]
        out = SITE / 'screenshots'
        out.mkdir(exist_ok=True)
        if len(shots) != len(SHOTS):
            keep = out / 'unsorted'
            keep.mkdir(exist_ok=True)
            for i, f in enumerate(shots):
                shutil.copy(f[-1], keep / f'{i:02}.png')
            sys.exit(f'expected {len(SHOTS)} steady views, found {len(shots)}; they\'re in {keep} to sort by hand')
        for name, f in zip(SHOTS, shots):
            webp = out / f'{name}.webp'
            subprocess.run(['cwebp', '-quiet', '-q', '80', '-resize', '2200', '0', str(f[-1]), '-o', str(webp)], check=True)
            print(f'{webp.relative_to(SITE)}  {webp.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
