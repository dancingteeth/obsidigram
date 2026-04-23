import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingVersion = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8')).version as string;

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __OBSIDIGRAM_LANDING_VERSION__: JSON.stringify(landingVersion),
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
});
