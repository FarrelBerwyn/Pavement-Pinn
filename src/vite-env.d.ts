/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * MapTiler browser key for the vector basemap. Public by design: restrict it to the
   * site's origins in the MapTiler dashboard. Without it the map uses OpenFreeMap.
   */
  readonly VITE_MAPTILER_KEY?: string;
  /**
   * 'true' enables demo access in a production build: the demo-account panel on the login
   * page and credential checks in the static (server-less) build. Off unless set; always on
   * in the dev server. See docs/LOGIN_AND_DEMO_AUTH.md.
   */
  readonly VITE_DEMO_ACCESS?: string;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
