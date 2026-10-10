// The app's themes and the accents each offers, mirroring theme.ts and
// AccentPicker.tsx in the app. The colours themselves come from the app's
// theme CSS; this only says what's there. Add a theme here when the app adds
// one.

export interface Accent {
  /** The palette colour's name: the accent is `var(--<name>)`. */
  name: string;
  label: string;
}

export interface Theme {
  id: string;
  label: string;
  appearance: 'light' | 'dark';
  accents: Accent[];
  /** The theme's own accent (what its CSS sets `--accent` to): the picker shows it first. */
  own: string;
}

const CATPPUCCIN: Accent[] = [
  'Rosewater',
  'Flamingo',
  'Pink',
  'Mauve',
  'Red',
  'Maroon',
  'Peach',
  'Yellow',
  'Green',
  'Teal',
  'Sky',
  'Sapphire',
  'Blue',
  'Lavender',
].map((label) => ({ name: label.toLowerCase(), label }));

// Magnitide's own themes: the mark's four colours, in its order (each theme tunes them).
const MAGNITIDE: Accent[] = [
  { name: 'yellow', label: 'Yellow' },
  { name: 'teal', label: 'Teal' },
  { name: 'purple', label: 'Purple' },
  { name: 'coral', label: 'Coral' },
];

// Sepia's: its own peach, then the mark's.
const SEPIA: Accent[] = [{ name: 'peach', label: 'Peach' }, ...MAGNITIDE];

const DRACULA: Accent[] = [
  { name: 'red', label: 'Red' },
  { name: 'peach', label: 'Orange' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'green', label: 'Green' },
  { name: 'sky', label: 'Cyan' },
  { name: 'mauve', label: 'Purple' },
  { name: 'pink', label: 'Pink' },
];

export const THEMES: Theme[] = [
  { id: 'light', label: 'Light', appearance: 'light', accents: MAGNITIDE, own: 'teal' },
  { id: 'dark', label: 'Dark', appearance: 'dark', accents: MAGNITIDE, own: 'teal' },
  { id: 'sepia', label: 'Sepia', appearance: 'light', accents: SEPIA, own: 'peach' },
  { id: 'catppuccin-latte', label: 'Catppuccin Latte', appearance: 'light', accents: CATPPUCCIN, own: 'mauve' },
  { id: 'catppuccin-frappe', label: 'Catppuccin Frappé', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
  { id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
  { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', appearance: 'dark', accents: CATPPUCCIN, own: 'mauve' },
  { id: 'dracula', label: 'Dracula', appearance: 'dark', accents: DRACULA, own: 'mauve' },
  { id: 'alucard', label: 'Alucard', appearance: 'light', accents: DRACULA, own: 'mauve' },
];

/** localStorage keys: the chosen theme ('system' or an id), and each theme's chosen accent. */
export const THEME_KEY = 'magnitide-site.theme';
export const ACCENTS_KEY = 'magnitide-site.accents';
