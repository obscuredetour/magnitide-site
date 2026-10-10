#!/usr/bin/env python3
"""Serve the site for editing, with no build step and live reload.

    ./serve.py [path-to-app-repo] [--port 8080]      default: ../magnitide

Pages, CSS, JS and data come straight from this repo; the theme CSS and the
icons come straight from the app checkout, at the paths build.sh copies them
to (themes/, assets/), so what you see is what `./build.sh` would publish.
Saving a file updates open pages: a stylesheet is swapped in place, anything
else reloads the page. Standard library only.
"""

import argparse
import http.server
import mimetypes
import os
import sys
import threading
import time
from pathlib import Path

SITE = Path(__file__).resolve().parent

# The live-reload client, added to every HTML page this server sends (not to
# the files themselves). CSS changes re-fetch the stylesheets; others reload.
CLIENT = b"""<script>
(() => {
  const events = new EventSource('/__reload');
  events.onmessage = (e) => {
    if (e.data !== 'css') return location.reload();
    for (const link of document.querySelectorAll('link[rel=stylesheet]')) {
      const url = new URL(link.href);
      url.searchParams.set('v', Date.now());
      link.href = url;
    }
  };
})();
</script>
"""


class Watcher:
    """Polls the files the site is made of; wakes waiting clients on a change."""

    def __init__(self, roots):
        self.roots = roots
        self.version = 0
        self.kind = None
        self.changed = threading.Condition()
        self.seen = self.scan()
        threading.Thread(target=self.run, daemon=True).start()

    def scan(self):
        files = {}
        for root in self.roots:
            for dirpath, dirnames, filenames in os.walk(root):
                dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in ('dist', 'node_modules')]
                for name in filenames:
                    path = os.path.join(dirpath, name)
                    try:
                        files[path] = os.stat(path).st_mtime_ns
                    except OSError:
                        pass
        return files

    def run(self):
        while True:
            time.sleep(0.3)
            now = self.scan()
            if now == self.seen:
                continue
            paths = {p for p in now.keys() | self.seen.keys() if now.get(p) != self.seen.get(p)}
            self.seen = now
            with self.changed:
                self.version += 1
                self.kind = 'css' if all(p.endswith('.css') for p in paths) else 'reload'
                self.changed.notify_all()

    def wait(self, since, timeout=15):
        with self.changed:
            self.changed.wait_for(lambda: self.version != since, timeout)
            return self.version, self.kind


def handler(app, watcher):
    themes = app / 'crates/app/ui/src/themes'
    icons = app / 'crates/app/icons'
    # Published path → file in the app repo (see build.sh).
    mapped = {
        'assets/icon.png': icons / 'icon.png',
        'assets/icon-small.png': icons / '128x128@2x.png',
    }

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(SITE), **kwargs)

        def log_message(self, fmt, *args):
            if not self.path.startswith('/__reload'):
                sys.stderr.write('%s\n' % (fmt % args))

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def do_GET(self):
            path = self.path.split('?', 1)[0].split('#', 1)[0].lstrip('/')
            if path == '__reload':
                return self.reload_stream()
            if path in ('', 'index.html') or path.endswith('.html') or path.endswith('/'):
                return self.send_html(SITE / (path if path.endswith('.html') else path + 'index.html'))
            if path.startswith('themes/'):
                file = (themes / path[len('themes/'):]).resolve()
                return self.send_file(file) if file.parent == themes.resolve() else self.send_error(404)
            if path in mapped:
                return self.send_file(mapped[path])
            return super().do_GET()

        def send_file(self, file, body=None):
            try:
                data = body if body is not None else file.read_bytes()
            except OSError:
                return self.send_error(404)
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def send_html(self, file):
            try:
                html = file.read_bytes()
            except OSError:
                return self.send_error(404)
            at = html.rfind(b'</body>')
            html = html[:at] + CLIENT + html[at:] if at >= 0 else html + CLIENT
            self.send_file(file, html)

        def reload_stream(self):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.end_headers()
            version = watcher.version
            try:
                while True:
                    now, kind = watcher.wait(version)
                    # A comment line keeps the connection open while nothing changes.
                    self.wfile.write(f'data: {kind}\n\n'.encode() if now != version else b': ping\n\n')
                    self.wfile.flush()
                    version = now
            except (BrokenPipeError, ConnectionResetError):
                pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description='Serve the site for editing, with live reload.')
    parser.add_argument('app', nargs='?', default=str(SITE.parent / 'magnitide'), help='path to the app repo')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    app = Path(args.app).resolve()
    if not (app / 'crates/app/ui/src/themes/index.css').is_file():
        sys.exit(f'no theme CSS under {app} (pass the app repo path)')

    watcher = Watcher([SITE, app / 'crates/app/ui/src/themes'])
    server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), handler(app, watcher))
    server.daemon_threads = True
    print(f'Serving http://localhost:{args.port} (themes and icons from {app}); edits reload the page.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
