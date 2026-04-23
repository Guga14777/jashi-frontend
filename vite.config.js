import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5177,
    host: true,
    hmr: { overlay: true },
    proxy: {
      '/api': { target: 'http://localhost:5182', changeOrigin: true, secure: false } // ✅ Changed to 5182
    }
  }
});