/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Publicado en GitHub Pages como sitio de proyecto: https://laura-m-stack.github.io/hilo/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/hilo/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
