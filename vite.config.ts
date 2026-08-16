import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './client',
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3000'
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared')
    }
  }
});
