import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {normalizeBasePath} from './src/constants/deployment';

/**
 * GitHub Pages has no rewrite rules: a deep link such as /PavementPinn/engine/pinn/ is
 * not a file, so Pages answers with 404.html. Shipping a copy of index.html under that
 * name lets the client-side router boot and render the requested route (direct
 * navigation and refresh keep working on the static host).
 */
function spaNotFoundFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pavement-pinn:spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        fs.copyFileSync(indexFile, path.join(outDir, '404.html'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: normalizeBasePath(process.env.VITE_BASE_PATH),
    plugins: [react(), tailwindcss(), spaNotFoundFallback()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? false : {},
    },
  };
});
