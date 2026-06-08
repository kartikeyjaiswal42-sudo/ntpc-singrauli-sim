import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        plant2d: resolve(__dirname, '2d/index.html'),
        illustrated: resolve(__dirname, 'illustrated/index.html'),
        plant3d: resolve(__dirname, '3d/index.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: '/',
  },
  preview: {
    port: 3000,
    strictPort: true,
    open: '/',
  },
});
