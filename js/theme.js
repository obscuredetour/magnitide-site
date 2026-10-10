// Theme and accent switching for the whole site, mirroring theme.ts and
// AccentPicker.tsx in the app: `data-theme` and `data-appearance` on <html>
// pick a theme from the app's own CSS; a chosen accent is an inline
// `--accent` on <html> plus `data-accent`, which accents.css picks up.
// A short inline copy of apply() runs in <head> so the page never flashes.
window.MagTheme = (() => {
  const CATPPUCCIN = [
    'Rosewater', 'Flamingo', 'Pink', 'Mauve', 'Red', 'Maroon', 'Peach',
    'Yellow', 'Green', 'Teal', 'Sky', 'Sapphire', 'Blue', 'Lavender',
  ].map((label) => ({ name: label.toLowerCase(), label }));
  // Magnitide's own themes: the mark's four colours, in its order (each theme tunes them).
  const MAGNITIDE = [
    { name: 'yellow', label: 'Yellow' },
    { name: 'teal', label: 'Teal' },
    { name: 'purple', label: 'Purple' },
    { name: 'coral', label: 'Coral' },
  ];
  // Sepia's: its own peach, then the mark's.
  const SEPIA = [{ name: 'peach', label: 'Peach' }, ...MAGNITIDE];
  const DRACULA = [
    { name: 'red', label: 'Red' },
    { name: 'peach', label: 'Orange' },
    { name: 'yellow', label: 'Yellow' },
    { name: 'green', label: 'Green' },
    { name: 'sky', label: 'Cyan' },
    { name: 'mauve', label: 'Purple' },
    { name: 'pink', label: 'Pink' },
  ];
  // `own` is the theme's own accent (what its CSS sets `--accent` to): the
  // picker shows it first, as the theme's, and not again among the rest.
  const THEMES = [
    { id: 'light', label: 'Light', appearance: 'light', accents: MAGNITIDE, own: 'coral' },
    { id: 'dark', label: 'Dark', appearance: 'dark', accents: MAGNITIDE, own: 'coral' },
    { id: 'sepia', label: 'Sepia', appearance: 'light', accents: SEPIA, own: 'peach' },
    { id: 'catppuccin-latte', label: 'Catppuccin Latte', appearance: 'light', accents: CATPPUCCIN, own: 'mauve' },
    { id: 'catppuccin-frappe', label: 'Catppuccin Frappé', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
    { id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
    { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
    { id: 'dracula', label: 'Dracula', appearance: 'dark', accents: DRACULA, own: 'mauve' },
    { id: 'alucard', label: 'Alucard', appearance: 'light', accents: DRACULA, own: 'mauve' },
  ];
  const KEY = 'magnitide-site.theme';
  const ACCENTS_KEY = 'magnitide-site.accents';
  const SAFE = /^[a-z][a-z0-9-]*$/;

  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* private mode, blocked storage: the choice just doesn't persist */
      }
    },
  };

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  let choice = store.get(KEY) || 'system';
  let accents = {};
  try {
    accents = JSON.parse(store.get(ACCENTS_KEY) || '{}') || {};
  } catch {
    accents = {};
  }
  const listeners = new Set();

  const byId = (id) => THEMES.find((t) => t.id === id);
  const current = () => (choice !== 'system' && byId(choice) ? choice : systemDark.matches ? 'dark' : 'light');
  const currentTheme = () => byId(current());
  const accentChoice = () => {
    const a = accents[current()];
    const t = currentTheme();
    return a && a !== t.own && t.accents.some((x) => x.name === a) ? a : null;
  };

  function apply() {
    const root = document.documentElement;
    const t = currentTheme();
    root.dataset.theme = t.id;
    root.dataset.appearance = t.appearance;
    const a = accentChoice();
    if (a && SAFE.test(a)) {
      root.dataset.accent = a;
      root.style.setProperty('--accent', `var(--${a})`);
    } else {
      delete root.dataset.accent;
      root.style.removeProperty('--accent');
    }
    listeners.forEach((fn) => fn());
  }

  function setTheme(id) {
    choice = id === 'system' || byId(id) ? id : 'system';
    store.set(KEY, choice);
    apply();
  }

  function setAccent(name) {
    if (name) accents[current()] = name;
    else delete accents[current()];
    store.set(ACCENTS_KEY, JSON.stringify(accents));
    apply();
  }

  systemDark.addEventListener('change', apply);

  // ---------- The menu, shared by the site nav and the mock's toolbar ----------

  const el = (tag, cls, attrs) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const icon = (name, size) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `icon${size ? ` icon-${size}` : ''}`);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  };

  /** A theme's colours, by scoping data-theme to the swatch itself (the app's trick). */
  function swatch(t) {
    const s = el('span', 'swatch', { 'data-theme': t.id, 'data-appearance': t.appearance, 'aria-hidden': 'true' });
    s.append(el('span', 'swatch-half'), el('span', 'swatch-dot'));
    return s;
  }

  function menuItem(label, checked, onSelect, lead) {
    const b = el('button', 'menu-item', { role: 'menuitemradio', 'aria-checked': String(checked), type: 'button' });
    b.append(icon('check', 14), lead || el('span'), document.createTextNode(label));
    b.addEventListener('click', onSelect);
    return b;
  }

  /** Builds the menu's contents into `panel`, re-rendered on every change. */
  function render(panel) {
    panel.replaceChildren();
    const label = (text) => {
      const l = el('div', 'menu-label');
      l.textContent = text;
      return l;
    };
    panel.append(label('Theme'));
    const sys = el('span', 'swatch swatch-system', { 'aria-hidden': 'true' });
    sys.append(
      el('span', 'swatch-sys-half', { 'data-theme': 'light', 'data-appearance': 'light' }),
      el('span', 'swatch-sys-half swatch-sys-right', { 'data-theme': 'dark', 'data-appearance': 'dark' }),
    );
    panel.append(menuItem('Match System', choice === 'system', () => setTheme('system'), sys));
    for (const t of THEMES) panel.append(menuItem(t.label, choice === t.id, () => setTheme(t.id), swatch(t)));
    panel.append(el('div', 'menu-sep'), label('Accent'));
    const row = el('div', 'accent-row', { role: 'group', 'aria-label': 'Accent colour' });
    const t = currentTheme();
    const ownAccent = t.accents.find((a) => a.name === t.own);
    const own = el('button', 'accent', {
      type: 'button',
      title: ownAccent ? `${ownAccent.label} (the theme’s own)` : 'The theme’s own',
      'aria-label': ownAccent ? `${ownAccent.label}, the theme’s own accent` : 'The theme’s own accent',
      'aria-checked': String(accentChoice() === null),
      role: 'menuitemradio',
    });
    const ownDot = el('span', 'accent-dot', { 'data-theme': t.id, 'data-appearance': t.appearance });
    ownDot.style.background = 'var(--accent)';
    own.append(ownDot);
    own.addEventListener('click', () => setAccent(null));
    row.append(own);
    for (const a of t.accents.filter((x) => x.name !== t.own)) {
      const b = el('button', 'accent', { type: 'button', title: a.label, 'aria-label': a.label, 'aria-checked': String(accentChoice() === a.name), role: 'menuitemradio' });
      const dot = el('span', 'accent-dot');
      dot.style.background = `var(--${a.name})`;
      b.append(dot);
      b.addEventListener('click', () => setAccent(a.name));
      row.append(b);
    }
    panel.append(row);
  }

  /**
   * Hooks a theme menu to `button`: the panel is appended to `host` (which
   * must be positioned) and aligned to its right edge under the button.
   */
  function attach(button, host) {
    const panel = el('div', 'menu theme-menu', { role: 'menu', 'aria-label': 'Theme', hidden: '' });
    host.append(panel);
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    const close = () => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const outside = (e) => {
      if (!panel.contains(e.target) && e.target !== button && !button.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        button.focus();
      }
    };
    button.addEventListener('click', () => {
      if (!panel.hidden) return close();
      render(panel);
      const hb = host.getBoundingClientRect();
      const bb = button.getBoundingClientRect();
      // In host coordinates, allowing for a scaled host (the mock).
      const scale = hb.width / host.offsetWidth || 1;
      panel.style.top = `${(bb.bottom - hb.top) / scale + 4}px`;
      panel.style.right = `${(hb.right - bb.right) / scale}px`;
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', onKey, true);
    });
    listeners.add(() => {
      if (!panel.hidden) render(panel);
    });
    return { close };
  }

  apply();
  return { THEMES, current, currentTheme, choice: () => choice, accentChoice, setTheme, setAccent, attach, onChange: (fn) => listeners.add(fn), icon, el };
})();
