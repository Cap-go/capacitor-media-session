import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  publicDir: '../assets',
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
});
