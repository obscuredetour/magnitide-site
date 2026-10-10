// Site behaviour: the icon sprite, the nav theme menu, download buttons
// filled from the latest GitHub release when one has assets, and the
// screenshot tabs.
(() => {
  // Icons: one sprite, fetched once and inlined so <use href="#i-…"> works everywhere.
  fetch('icons.svg')
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.statusText))))
    .then((svg) => {
      const holder = document.createElement('div');
      holder.innerHTML = svg;
      holder.hidden = true;
      document.body.prepend(holder);
    })
    .catch(() => {
      /* icons stay blank; the text still reads */
    });

  const navTheme = document.getElementById('nav-theme');
  if (navTheme) window.MagTheme.attach(navTheme, navTheme.closest('.wrap'));

  // Downloads: per-OS buttons from the latest release's assets, when there are any.
  const box = document.getElementById('downloads');
  if (!box) return;
  const REPO = 'obscuredetour/magnitide';
  const kinds = [
    { label: 'macOS', match: /\.dmg$/i },
    { label: 'Windows', match: /\.(msi|exe)$/i },
    { label: 'Linux', match: /\.(AppImage|deb)$/i },
  ];
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
    .then((rel) => {
      const assets = rel.assets || [];
      const found = kinds.map((k) => ({ ...k, asset: assets.find((a) => k.match.test(a.name)) })).filter((k) => k.asset);
      if (!found.length) return;
      box.replaceChildren();
      for (const k of found) {
        const a = document.createElement('a');
        a.className = 'btn primary';
        a.href = k.asset.browser_download_url;
        a.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-download"/></svg>${k.label}`;
        box.append(a);
      }
      const all = document.createElement('a');
      all.className = 'btn ghost';
      all.href = rel.html_url;
      all.textContent = 'All downloads';
      box.append(all);
      const ver = document.createElement('p');
      ver.className = 'ver';
      ver.textContent = `${rel.tag_name}${rel.published_at ? `, released ${new Date(rel.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`;
      box.append(ver);
    })
    .catch(() => {
      /* no release yet, rate-limited or offline: the Releases link stays */
    });
})();

// The screenshot tabs: one view at a time; arrow keys move between tabs.
(() => {
  const tabs = [...document.querySelectorAll('.shot-tab')];
  const select = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
  };
  for (const [i, tab] of tabs.entries()) {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  }
})();
