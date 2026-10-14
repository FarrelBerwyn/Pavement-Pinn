/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * MapTiler browser key for the vector basemap. Public by design: restrict it to the
   * site's origins in the MapTiler dashboard. Without it the map uses OpenFreeMap.
   */
  readonly VITE_MAPTILER_KEY?: string;
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
