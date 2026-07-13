import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './', // Ensures relative assets so it hosts properly on GitHub Pages subpaths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
