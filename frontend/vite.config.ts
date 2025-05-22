import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: '../dist', // Output to the root /dist
    emptyOutDir: true,   // Clear /dist before building
  },
  server: {
    port: 5173, // Default Vite port
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your Hono backend port
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});