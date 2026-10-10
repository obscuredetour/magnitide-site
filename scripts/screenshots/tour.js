// The screenshot tour, run inside the app by scripts/screenshots.py: it's
// copied to crates/app/ui/dev-hook.js (with __DEMO__ replaced by the demo
// library's path) and loaded by `cargo tauri dev`'s page. It opens the demo
// library, shows each view for HOLD ms in Light and then Dark, and puts
// everything back: the library, and every setting it touched (it restores
// localStorage as it found it). A magenta slate fills the window at the start
// and the end, so the capture knows which frames are the tour's.
//
// What it found is saved in localStorage (KEY) before anything changes, and
// goes when it's put back, which is how screenshots.py knows it's done. If a
// tour is cut short (the app relaunched), the next one restores from that.
const DEMO = '__DEMO__';
const HOLD = 3500;
const KEY = 'screenshotTourSaved';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (sessionStorage.getItem('screenshotTourDone')) return;
  const library = await import('/src/library.ts');
  const theme = await import('/src/theme.ts');
  const view = await import('/src/view.ts');
  const browse = await import('/src/browse.ts');
  const editor = await import('/src/editor.ts');
  const { emit } = await import('@tauri-apps/api/event');

  for (let i = 0; i < 100 && !library.library(); i++) await wait(100);
  const pending = localStorage.getItem(KEY);
  const saved = pending
    ? JSON.parse(pending)
    : Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
  localStorage.setItem(KEY, JSON.stringify(saved));
  const original = saved.libraryPath ?? library.library()?.path;

  // A still picture for every step: no animation, no blinking caret.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
  document.head.append(still);
  const slate = document.createElement('div');
  slate.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#ff00ff';
  const showSlate = async () => {
    document.body.append(slate);
    await wait(2000);
    slate.remove();
  };

  const settings = async (page) => {
    if (!document.querySelector('dialog[aria-label="Settings"]')) await emit('open-settings');
    await wait(300);
    for (const b of document.querySelectorAll('nav[aria-label="Settings sections"] button'))
      if (b.textContent.trim() === page) b.click();
  };
  const closeSettings = () => document.querySelector('button[aria-label="Close settings"]')?.click();
  // A dialog focuses its first control; no focus ring in a screenshot.
  const unfocus = () => document.activeElement instanceof HTMLElement && document.activeElement.blur();
  // Every scrolled list back at its start (the grid keeps its place between steps).
  const toTop = () => {
    for (const n of document.querySelectorAll('main *')) if (n.scrollTop) n.scrollTop = 0;
  };

  await library.openLibrary(DEMO);
  await wait(500);
  view.setSidebarOpen(true);
  view.setViewMode('grid');
  const book = library.items().find((b) => b.title === 'Pride and Prejudice') ?? library.items()[0];
  await showSlate();

  for (const t of ['light', 'dark']) {
    theme.setTheme(t);
    theme.setAccent(null);

    // Browse: the sidebar's other mode, three categories open, and every tag in the panel.
    library.setSelectedId(null);
    library.setDetailsOpen(false);
    browse.setSidebarMode('browse');
    for (const key of ['authors', 'series', 'tags']) if (!browse.expanded().has(key)) browse.toggleExpanded(key);
    browse.openBrowsePanel('tags');
    await wait(300);
    toTop();
    await wait(HOLD);
    browse.closeBrowsePanel();
    browse.setSidebarMode('shelves');

    // The edit window, over the book's details.
    library.setSelectedId(book.id);
    library.setDetailsOpen(true);
    await editor.openEditor(book.id);
    await wait(300);
    unfocus();
    await wait(HOLD);
    editor.closeEditor();
    await wait(300);

    // Settings › Library (Themes would show the add-on themes installed here).
    await settings('Library');
    await wait(300);
    unfocus();
    await wait(HOLD);
    closeSettings();
  }

  await showSlate();
  // Back as it was: the library, then every stored setting, then a reload so
  // the page reads them again (and doesn't run the tour a second time).
  if (original) await library.openLibrary(original);
  localStorage.clear(); // KEY too
  for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
  sessionStorage.setItem('screenshotTourDone', '1');
  location.reload();
})();
