// The faux Magnitide window: a small library, search with the app's
// syntax, covers and list views, shelves, a details panel, selection,
// a right-click menu and a pretend job. No backend, no persistence.
(() => {
  const { el, icon } = window.MagTheme;
  const lib = window.MOCK_LIBRARY;
  const books = lib.books.map((b) => ({ ...b, onDevice: !!b.onDevice }));
  const mock = document.getElementById('mock');
  if (!mock) return;
  const frame = document.getElementById('mock-frame');
  const $ = (id) => document.getElementById(id);

  // ---------- Scale the 1180×720 window to its container ----------
  const fit = () => mock.style.setProperty('--mock-scale', String(frame.clientWidth / 1180));
  new ResizeObserver(fit).observe(frame);
  fit();
  const scale = () => frame.clientWidth / 1180;

  // ---------- State ----------
  const state = {
    query: '',
    view: 'grid',
    sort: 'title',
    dir: 'asc',
    selected: new Set(),
    anchor: null,
    details: null,
    sidebar: true,
    tile: 120,
  };

  // ---------- Search: the app's syntax, enough of it ----------
  const FIELDS = new Set(['author', 'authors', 'tag', 'tags', 'series', 'title', 'publisher', 'format', 'formats', 'shelf', 'ondevice', '#pages']);
  function tokenize(q) {
    const out = [];
    const re = /(-?)(?:([#\w]+):)?(?:"([^"]*)"|(\S+))/g;
    let m;
    while ((m = re.exec(q))) out.push({ not: m[1] === '-', field: m[2]?.toLowerCase() ?? null, value: (m[3] ?? m[4] ?? '').toLowerCase() });
    return out;
  }
  const has = (hay, needle) => hay.some((h) => h.toLowerCase().includes(needle));
  function matches(b, t) {
    const v = t.value;
    let hit;
    switch (t.field) {
      case null:
        hit = has([b.title, b.authors, b.series ?? '', b.publisher, ...b.tags], v);
        break;
      case 'author':
      case 'authors':
        hit = b.authors.toLowerCase().includes(v);
        break;
      case 'tag':
      case 'tags':
        hit = has(b.tags, v);
        break;
      case 'series':
        hit = (b.series ?? '').toLowerCase().includes(v);
        break;
      case 'title':
        hit = b.title.toLowerCase().includes(v);
        break;
      case 'publisher':
        hit = b.publisher.toLowerCase().includes(v);
        break;
      case 'format':
      case 'formats':
        hit = has(b.formats, v);
        break;
      case 'shelf':
        hit = b.shelves.some((s) => s.toLowerCase() === v) || has(b.shelves, v);
        break;
      case 'ondevice':
        hit = b.onDevice === (v === 'yes' || v === 'true');
        break;
      case '#pages': {
        const n = parseInt(v.replace(/^[<>=]+/, ''), 10);
        hit = v.startsWith('>') ? b.pages > n : v.startsWith('<') ? b.pages < n : b.pages === n;
        break;
      }
      default:
        hit = false;
    }
    return t.not ? !hit : hit;
  }
  function queryError(q) {
    const bad = tokenize(q).find((t) => t.field && !FIELDS.has(t.field));
    return bad ? `Unknown field "${bad.field}:"` : null;
  }
  function shown() {
    const tokens = tokenize(state.query);
    const list = books.filter((b) => tokens.every((t) => matches(b, t)));
    const key = state.sort;
    const val = (b) =>
      key === 'author'
        ? b.authors.split(' ').pop()
        : key === 'series'
          ? `${b.series ?? '￿'}${String(b.seriesIndex ?? 0).padStart(3, '0')}`
          : key === 'rating'
            ? b.stars
            : key === 'added'
              ? b.added
              : key === 'published'
                ? b.published
                : key === 'publisher'
                  ? b.publisher
                  : key === 'size'
                    ? b.size
                    : b.title.replace(/^(the|a|an) /i, '');
    list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return state.dir === 'asc' ? c : -c;
    });
    return list;
  }

  // ---------- Pieces ----------
  const hue = (b) => (b.id * 47) % 360;
  function cover(b, { large = false, compact = false } = {}) {
    const c = el('div', `m-placeholder${compact ? ' compact' : ''}`);
    c.style.setProperty('--hue', String(hue(b)));
    const t = el('div', `m-placeholder-title${large ? ' lg' : ''}`);
    t.textContent = b.title;
    const a = el('div', 'm-placeholder-author');
    a.textContent = b.authors;
    c.append(t, a);
    return c;
  }
  const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
  const sizeText = (mb) => (mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(mb * 1024)} KB`);
  const date = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const bookEl = (b) => (state.view === 'grid' ? mock.querySelector(`.m-tile[data-id="${b.id}"]`) : mock.querySelector(`.m-tr[data-id="${b.id}"]`));

  // ---------- Rendering ----------
  const main = $('m-main');
  const searchInput = $('m-search');

  function renderSidebar() {
    const nav = $('m-sidebar');
    nav.replaceChildren();
    const shelfQuery = (name) => `shelf:"${name}"`;
    const all = el('button', 'm-row', { type: 'button', 'aria-current': String(!state.query.trim()) });
    all.append(icon('library-big'), Object.assign(el('span', 'm-row-name'), { textContent: 'All Books' }), Object.assign(el('span', 'm-row-count'), { textContent: String(books.length) }));
    all.addEventListener('click', () => setQuery(''));
    nav.append(all);
    const head = el('div', 'm-side-head');
    head.append(Object.assign(el('div', 'm-side-label'), { textContent: 'Shelves' }));
    const plus = el('button', 'm-side-plus', { type: 'button', title: 'New shelf' });
    plus.append(icon('plus'));
    head.append(plus);
    nav.append(head);
    for (const name of lib.shelves) {
      const count = books.filter((b) => b.shelves.includes(name)).length;
      const row = el('button', 'm-row', { type: 'button', 'aria-current': String(state.query.trim() === shelfQuery(name)), title: `${name} · double-click to rename` });
      row.append(icon('square-library'), Object.assign(el('span', 'm-row-name'), { textContent: name }), Object.assign(el('span', 'm-row-count'), { textContent: String(count) }));
      row.addEventListener('click', () => setQuery(shelfQuery(name)));
      nav.append(row);
    }
  }

  function renderMain() {
    const list = shown();
    main.replaceChildren();
    if (!list.length) {
      const p = el('p', 'm-empty');
      p.textContent = 'No books match. Try author:, tag:, series: or #pages:>500.';
      main.append(p);
    } else if (state.view === 'grid') {
      const grid = el('div', 'm-grid');
      grid.style.setProperty('--tile', `${state.tile}px`);
      for (const b of list) {
        const tile = el('div', 'm-tile', { 'data-id': String(b.id), tabindex: '-1' });
        if (state.selected.has(b.id)) tile.dataset.selected = '';
        const c = el('div', 'm-cover');
        c.append(cover(b));
        if (b.onDevice) {
          const badge = el('span', 'm-on-device', { title: `On ${lib.device.name}` });
          badge.append(icon('check', 12));
          c.append(badge);
        }
        if (b.formats.length > 1) c.append(Object.assign(el('span', 'm-count-pill'), { textContent: String(b.formats.length), title: b.formats.join(', ') }));
        tile.append(c, Object.assign(el('p', 'm-tile-title'), { textContent: b.title }), Object.assign(el('p', 'm-tile-author'), { textContent: b.authors }));
        wire(tile, b);
        grid.append(tile);
      }
      main.append(grid);
    } else {
      const cols = [
        ['title', 'Title', 300],
        ['device', 'On Device', 90],
        ['author', 'Author', 160],
        ['series', 'Series', 190],
        ['rating', 'Rating', 96],
        ['published', 'Published', 92],
        ['added', 'Date Added', 120],
        ['publisher', 'Publisher', 140],
        ['tags', 'Tags', 220],
        ['formats', 'Formats', 150],
        ['size', 'Size', 80, 'end'],
        ['pages', 'Pages', 80, 'end'],
      ];
      const table = el('div', 'm-table');
      const head = el('div', 'm-thead');
      for (const [key, label, w, align] of cols) {
        const th = el('div', `m-th${align ? ' end' : ''}`);
        th.style.width = `${w}px`;
        th.textContent = label;
        if (key === state.sort) {
          th.dataset.active = '';
          th.append(icon(state.dir === 'asc' ? 'chevron-up' : 'chevron-down', 12));
        }
        if (!['device', 'tags', 'formats', 'pages'].includes(key)) th.addEventListener('click', () => setSort(key, key === state.sort ? (state.dir === 'asc' ? 'desc' : 'asc') : 'asc'));
        head.append(th);
      }
      table.append(head);
      for (const b of list) {
        const tr = el('div', 'm-tr', { 'data-id': String(b.id), tabindex: '-1' });
        if (state.selected.has(b.id)) tr.dataset.selected = '';
        for (const [key, , w, align] of cols) {
          const td = el('div', `m-td${align ? ' end' : ''}`);
          td.style.width = `${w}px`;
          switch (key) {
            case 'title': {
              const wrap = el('span', 'm-td-title');
              const mini = el('span', 'm-mini');
              mini.append(cover(b, { compact: true }));
              wrap.append(mini, Object.assign(el('span', 'name'), { textContent: b.title }));
              td.append(wrap);
              break;
            }
            case 'device':
              if (b.onDevice) {
                const chk = icon('check');
                chk.classList.add('m-success');
                td.append(chk);
              }
              break;
            case 'author':
              td.textContent = b.authors;
              break;
            case 'series':
              if (b.series) {
                td.append(document.createTextNode(`${b.series} `), Object.assign(el('span', 'm-muted'), { textContent: `#${b.seriesIndex}` }));
              }
              break;
            case 'rating':
              td.append(Object.assign(el('span', 'm-stars'), { textContent: stars(b.stars), title: `${b.stars} of 5` }));
              break;
            case 'published':
              td.textContent = String(b.published);
              break;
            case 'added':
              td.textContent = date(b.added);
              break;
            case 'publisher':
              td.textContent = b.publisher;
              break;
            case 'tags':
              td.textContent = b.tags.join(', ');
              break;
            case 'formats': {
              const chips = el('span', 'm-format-chips');
              for (const f of b.formats) chips.append(Object.assign(el('span', 'm-format-chip'), { textContent: f }));
              td.append(chips);
              break;
            }
            case 'size':
              td.textContent = sizeText(b.size);
              break;
            case 'pages':
              td.textContent = String(b.pages);
              break;
          }
          tr.append(td);
        }
        wire(tr, b);
        table.append(tr);
      }
      main.append(table);
    }
    const total = books.length;
    $('m-count').textContent = list.length === total ? `${total} books` : `${list.length} of ${total} books`;
  }

  function renderDetails() {
    const panel = $('m-details');
    const b = books.find((x) => x.id === state.details);
    if (!b) {
      panel.hidden = true;
      panel.replaceChildren();
      return;
    }
    panel.replaceChildren();
    panel.hidden = false;
    const tools = el('div', 'm-details-tools');
    const edit = el('button', 'm-glass pill', { type: 'button', title: 'Edit metadata (⌘E)' });
    edit.textContent = 'Edit';
    const close = el('button', 'm-glass', { type: 'button', 'aria-label': 'Close (Esc)' });
    close.append(icon('x'));
    close.addEventListener('click', () => openDetails(null));
    tools.append(edit, close);

    const body = el('div', 'm-details-body');
    const cov = el('div', 'm-details-cover');
    cov.append(cover(b, { large: true }));

    const head = el('div', 'm-details-head');
    head.append(Object.assign(el('h2', 'm-details-title'), { textContent: b.title }));
    const by = el('p');
    const a = el('span', 'm-link');
    a.textContent = b.authors;
    a.addEventListener('click', () => setQuery(`author:"${b.authors}"`));
    by.append(a);
    head.append(by);
    if (b.series) {
      const s = el('p', 'm-details-series');
      const link = el('span', 'm-link');
      link.textContent = b.series;
      link.addEventListener('click', () => setQuery(`series:"${b.series}"`));
      s.append(link, document.createTextNode(` #${b.seriesIndex}`));
      head.append(s);
    }
    if (b.stars) head.append(Object.assign(el('div', 'm-stars'), { textContent: stars(b.stars), title: `${b.stars} of 5` }));

    const dl = el('dl', 'm-dl');
    for (const [k, v] of [
      ['Published', String(b.published)],
      ['Publisher', b.publisher],
      ['Added', date(b.added)],
      ['Pages', String(b.pages)],
    ]) {
      dl.append(Object.assign(el('dt'), { textContent: k }), Object.assign(el('dd'), { textContent: v }));
    }

    const chips = el('div', 'm-chips');
    for (const s of b.shelves) {
      const c = el('span', 'm-chip shelf');
      c.append(icon('square-library', 12), document.createTextNode(s));
      c.addEventListener('click', () => setQuery(`shelf:"${s}"`));
      chips.append(c);
    }
    for (const t of b.tags) {
      const c = el('span', 'm-chip');
      c.textContent = t;
      c.addEventListener('click', () => setQuery(`tag:"${t}"`));
      chips.append(c);
    }

    const formats = el('section', 'm-section');
    formats.append(Object.assign(el('h3', 'm-section-label'), { textContent: 'Formats' }));
    const fchips = el('div', 'm-chips');
    for (const f of b.formats) fchips.append(Object.assign(el('span', 'm-chip'), { textContent: f }));
    formats.append(fchips);
    const buttons = el('div', 'm-buttons');
    const send = el('button', `m-btn${b.onDevice ? '' : ' primary'}`, { type: 'button' });
    send.textContent = b.onDevice ? `On ${lib.device.name}` : `Send to ${lib.device.name}`;
    send.disabled = b.onDevice;
    send.addEventListener('click', () => sendToDevice([b.id]));
    const open = el('button', `m-btn${b.onDevice ? ' primary' : ''}`, { type: 'button' });
    open.textContent = 'Open';
    const convert = el('button', 'm-btn', { type: 'button' });
    convert.textContent = 'Convert…';
    buttons.append(send, open, convert);
    formats.append(buttons);
    if (b.onDevice) {
      const line = el('div', 'm-on-line');
      line.append(icon('check', 12), Object.assign(el('b'), { textContent: `On ${lib.device.name}` }), Object.assign(el('span', 'm-muted'), { textContent: `Magnitide/${b.authors}/${b.title.split(/[;:]/)[0]}.kepub.epub` }));
      formats.append(line);
    }

    const desc = el('section', 'm-section');
    desc.append(Object.assign(el('h3', 'm-section-label'), { textContent: 'Description' }));
    const d = el('div', 'm-desc');
    d.append(Object.assign(el('p'), { textContent: b.description }));
    desc.append(d);

    body.append(cov, head, dl, chips, formats, desc);
    panel.append(tools, body);
  }

  function renderSelbar() {
    const bar = $('m-selbar');
    bar.replaceChildren();
    if (state.selected.size < 2) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const ids = [...state.selected];
    const on = ids.filter((id) => books.find((b) => b.id === id).onDevice).length;
    bar.append(Object.assign(el('span', 'm-selbar-count'), { textContent: `${ids.length} selected` }));
    const btn = (label, fn, disabled) => {
      const b = el('button', '', { type: 'button' });
      b.textContent = label;
      if (fn) b.addEventListener('click', fn);
      if (disabled) b.disabled = true;
      bar.append(b);
    };
    btn('Edit…');
    btn('Find Metadata…');
    btn(`Send to ${lib.device.name}`, () => sendToDevice(ids), on === ids.length);
    if (on) btn(`Remove from ${lib.device.name} (${on})`, () => removeFromDevice(ids));
    btn('Convert…');
    if (ids.length === 2) btn('Merge…');
    const x = el('button', 'm-selbar-x', { type: 'button', 'aria-label': 'Clear selection (Esc)' });
    x.append(icon('x', 12));
    x.addEventListener('click', () => select([], null));
    bar.append(x);
  }

  function renderAll() {
    renderSidebar();
    renderMain();
    renderDetails();
    renderSelbar();
    $('m-device-count').textContent = String(books.filter((b) => b.onDevice).length);
  }

  // ---------- Actions ----------
  function setQuery(q) {
    state.query = q;
    searchInput.value = q;
    $('m-clear').hidden = !q;
    const err = queryError(q);
    searchInput.setAttribute('aria-invalid', String(!!err));
    searchInput.title = err ?? '';
    renderSidebar();
    renderMain();
  }
  function setSort(key, dir) {
    state.sort = key;
    state.dir = dir;
    $('m-sort').value = key;
    $('m-sortdir').replaceChildren(icon(dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow'));
    $('m-sortdir').title = dir === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)';
    renderMain();
  }
  function setView(view) {
    state.view = view;
    $('m-view-grid').setAttribute('aria-pressed', String(view === 'grid'));
    $('m-view-list').setAttribute('aria-pressed', String(view === 'list'));
    $('m-size').style.visibility = view === 'grid' ? '' : 'hidden';
    renderMain();
  }
  function select(ids, anchor) {
    state.selected = new Set(ids);
    state.anchor = anchor;
    for (const n of main.querySelectorAll('[data-selected]')) delete n.dataset.selected;
    for (const id of ids) {
      const n = bookEl({ id });
      if (n) n.dataset.selected = '';
    }
    renderSelbar();
  }
  function openDetails(id) {
    state.details = id;
    renderDetails();
  }
  function wire(node, b) {
    node.addEventListener('click', (e) => {
      mock.focus({ preventScroll: true });
      if (e.metaKey || e.ctrlKey) {
        const next = new Set(state.selected);
        if (next.has(b.id)) next.delete(b.id);
        else next.add(b.id);
        select([...next], b.id);
        if (next.size === 1) openDetails([...next][0]);
      } else if (e.shiftKey && state.anchor !== null) {
        const order = shown().map((x) => x.id);
        const [i, j] = [order.indexOf(state.anchor), order.indexOf(b.id)].sort((x, y) => x - y);
        select(order.slice(i, j + 1), state.anchor);
      } else {
        select([b.id], b.id);
        openDetails(b.id);
      }
    });
    node.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!state.selected.has(b.id)) {
        select([b.id], b.id);
        openDetails(b.id);
      }
      contextMenu(e, [...state.selected]);
    });
  }

  // ---------- Pretend jobs ----------
  const jobSlot = $('m-job');
  let jobs = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function setJob(text) {
    jobSlot.replaceChildren();
    if (text) jobSlot.append(icon('loader-circle', 12), Object.assign(el('span'), { textContent: text }));
  }
  async function sendToDevice(ids) {
    const targets = ids.map((id) => books.find((b) => b.id === id)).filter((b) => !b.onDevice);
    if (!targets.length) return;
    for (const b of targets) {
      if (!b.formats.includes('KEPUB')) {
        setJob(`Converting “${b.title.split(/[;:]/)[0]}” to KEPUB…`);
        await wait(900);
        b.formats.push('KEPUB');
      }
      setJob(`Sending “${b.title.split(/[;:]/)[0]}” to ${lib.device.name}…`);
      await wait(900);
      b.onDevice = true;
      renderAll();
    }
    setJob(`Updating ${lib.device.name}’s collections…`);
    await wait(600);
    setJob(null);
    jobs += 1;
    $('m-activity-badge').textContent = String(jobs);
    $('m-activity-badge').hidden = false;
    toast(`Sent ${targets.length === 1 ? 'one book' : `${targets.length} books`} to ${lib.device.name}`);
  }
  async function removeFromDevice(ids) {
    setJob(`Removing from ${lib.device.name}…`);
    await wait(700);
    for (const id of ids) books.find((b) => b.id === id).onDevice = false;
    setJob(null);
    renderAll();
  }
  function toast(text) {
    const t = el('div', 'm-toast');
    t.textContent = text;
    mock.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- Menus ----------
  let openMenu = null;
  function closeMenu() {
    if (openMenu) {
      openMenu.remove();
      openMenu = null;
    }
  }
  document.addEventListener('pointerdown', (e) => {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  });
  function showMenu(x, y, items, cls = '') {
    closeMenu();
    const menu = el('div', `menu ${cls}`, { role: 'menu' });
    for (const it of items) {
      if (it === '-') {
        menu.append(el('div', 'menu-sep'));
        continue;
      }
      if (it.label) {
        menu.append(Object.assign(el('div', 'menu-label'), { textContent: it.label }));
        continue;
      }
      const b = el('button', `menu-item plain${it.danger ? ' danger' : ''}`, { type: 'button', role: 'menuitem' });
      b.append(document.createTextNode(it.text));
      if (it.disabled) b.disabled = true;
      b.addEventListener('click', () => {
        closeMenu();
        it.run?.();
      });
      menu.append(b);
    }
    mock.append(menu);
    const maxX = 1180 - menu.offsetWidth - 8;
    const maxY = 720 - menu.offsetHeight - 8;
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
    openMenu = menu;
  }
  function contextMenu(e, ids) {
    const r = mock.getBoundingClientRect();
    const s = scale();
    const x = (e.clientX - r.left) / s;
    const y = (e.clientY - r.top) / s;
    const on = ids.filter((id) => books.find((b) => b.id === id).onDevice).length;
    const one = ids.length === 1;
    showMenu(x, y, [
      { text: 'Open' },
      { text: one ? 'Edit Metadata…' : `Edit ${ids.length} Books…` },
      { text: 'Find Metadata…' },
      '-',
      { text: `Send to ${lib.device.name}`, run: () => sendToDevice(ids), disabled: on === ids.length },
      ...(on ? [{ text: `Remove from ${lib.device.name}`, run: () => removeFromDevice(ids) }] : []),
      { text: 'Convert…' },
      '-',
      { text: 'Add to Shelf' },
      { text: 'Plugins' },
      '-',
      { text: 'Show in Finder' },
      { text: 'Move to Trash…', danger: true },
    ]);
  }

  // ---------- Toolbar wiring ----------
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => setQuery(searchInput.value), 120);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (searchInput.value) setQuery('');
      else mock.focus();
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      mock.focus();
    }
  });
  $('m-clear').addEventListener('click', () => setQuery(''));
  $('m-sidebar-toggle').addEventListener('click', (e) => {
    state.sidebar = !state.sidebar;
    $('m-sidebar').hidden = !state.sidebar;
    e.currentTarget.setAttribute('aria-pressed', String(state.sidebar));
    e.currentTarget.title = state.sidebar ? 'Hide shelves' : 'Show shelves';
  });
  $('m-view-grid').addEventListener('click', () => setView('grid'));
  $('m-view-list').addEventListener('click', () => setView('list'));
  $('m-sort').addEventListener('change', (e) => setSort(e.target.value, state.dir));
  $('m-sortdir').addEventListener('click', () => setSort(state.sort, state.dir === 'asc' ? 'desc' : 'asc'));
  $('m-size').addEventListener('input', (e) => {
    state.tile = Number(e.target.value);
    const grid = main.querySelector('.m-grid');
    if (grid) grid.style.setProperty('--tile', `${state.tile}px`);
  });
  $('m-plugins-btn').addEventListener('click', (e) => {
    const r = mock.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    const s = scale();
    showMenu((b.left - r.left) / s - 160, (b.bottom - r.top) / s + 4, [
      { label: 'Magnitide plugins' },
      { text: 'Fix Series Numbering', run: () => fakeAction('Fix Series Numbering') },
      { text: 'Fetch Covers from Open Library…', run: () => fakeAction('Fetch Covers') },
      { label: 'calibre plugins' },
      { text: 'Count Pages', run: () => fakeAction('Count Pages') },
      { text: 'Generate Cover…' },
      { text: 'Quality Check' },
      { text: 'Reading List' },
      '-',
      { text: 'Manage Plugins…' },
    ]);
  });
  async function fakeAction(name) {
    const n = state.selected.size || books.length;
    setJob(`${name}: ${n === 1 ? '1 book' : `${n} books`}…`);
    await wait(1400);
    setJob(null);
    jobs += 1;
    $('m-activity-badge').textContent = String(jobs);
    $('m-activity-badge').hidden = false;
    toast(`${name} finished`);
  }
  window.MagTheme.attach($('m-theme-btn'), mock);
  $('m-library-btn').addEventListener('click', (e) => {
    const r = mock.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    const s = scale();
    showMenu((b.left - r.left) / s, (b.bottom - r.top) / s + 4, [
      { label: 'Libraries' },
      { text: '✓ My Library' },
      { text: 'Calibre Library  (read-only)' },
      '-',
      { text: 'Open Library…' },
      { text: 'Import a calibre Library…' },
    ]);
  });
  $('m-device-btn').addEventListener('click', (e) => {
    const r = mock.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    const s = scale();
    const on = books.filter((x) => x.onDevice).length;
    showMenu((b.left - r.left) / s, (b.bottom - r.top) / s + 4, [
      { label: lib.device.name },
      { text: `${on} ${on === 1 ? 'book' : 'books'} from this library · 24.1 GB free of 28.4 GB` },
      { text: 'Sync Shelves', run: () => fakeAction('Sync Shelves') },
      { text: 'Rescan' },
      { text: `Eject “${lib.device.name}”` },
      '-',
      { label: 'Show' },
      { text: 'All books', run: () => setQuery('') },
      { text: 'Books on a device', run: () => setQuery('ondevice:yes') },
    ]);
  });

  // ---------- Keys (only while the mock has focus) ----------
  mock.addEventListener('keydown', (e) => {
    const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === '/' && !inInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (mod && e.key === '1') {
      e.preventDefault();
      setView('grid');
    } else if (mod && e.key === '2') {
      e.preventDefault();
      setView('list');
    } else if (mod && e.key.toLowerCase() === 'a' && !inInput) {
      e.preventDefault();
      select(shown().map((b) => b.id), state.anchor);
    } else if (e.key === 'Escape' && !inInput) {
      if (openMenu) closeMenu();
      else if (state.selected.size > 1) select(state.details ? [state.details] : [], state.details);
      else if (state.details !== null) openDetails(null);
      else if (state.query) setQuery('');
    } else if (!inInput && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const order = shown().map((b) => b.id);
      if (!order.length) return;
      const cur = order.indexOf(state.anchor ?? -1);
      let next;
      if (cur < 0) next = 0;
      else if (state.view === 'list') next = cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1);
      else {
        const grid = main.querySelector('.m-grid');
        const perRow = grid ? Math.max(1, Math.round(grid.clientWidth / (grid.firstChild?.offsetWidth + 18 || 1))) : 1;
        next = cur + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? perRow : -perRow);
      }
      next = Math.max(0, Math.min(order.length - 1, next));
      select([order[next]], order[next]);
      if (state.details !== null) openDetails(order[next]);
      bookEl({ id: order[next] })?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && !inInput && state.anchor !== null) {
      openDetails(state.anchor);
    }
  });
  mock.addEventListener('pointerdown', () => {
    if (!mock.contains(document.activeElement)) mock.focus({ preventScroll: true });
  });

  // ---------- Go ----------
  renderAll();
  setSort('title', 'asc');
  // Open one book so the panel is in the first impression.
  select([1], 1);
  openDetails(1);
})();
