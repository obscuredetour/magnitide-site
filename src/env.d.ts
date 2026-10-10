// What the site reads of the app icon's Icon Composer file (appIcon.ts): the
// background per appearance and the layers' order. It lives in the app repo,
// behind the @app-icons alias, so TypeScript can't see it for itself.
declare module '@app-icons/Magnitide.icon/icon.json' {
  const icon: {
    'fill-specializations': { appearance?: 'dark' | 'tinted'; value: { solid: string } }[];
    groups: { layers: { name: string; 'image-name': string }[] }[];
  };
  export default icon;
}
