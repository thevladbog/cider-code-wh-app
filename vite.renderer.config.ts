import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  base: './',
  build: {
    outDir: '.vite/renderer',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    sourcemap: process.env.MODE === 'development',
    rollupOptions: {
      input: {
        main_window: 'index.html',
      },
      external: ['electron'],
    },
  },
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  define: {
    global: 'globalThis',
    __dirname: 'undefined',
    __filename: 'undefined',
    process: { env: {} },
  },
  server: {
    host: '127.0.0.1',
    port: 5173, // Port 5173 to match main.ts settings
    strictPort: true, // Strict port compliance
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
    exclude: ['electron'],
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer')
      ],
    },
  },
});
