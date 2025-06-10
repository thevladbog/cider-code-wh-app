import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Получаем текущую среду из переменной окружения или используем development по умолчанию
const mode = process.env.NODE_ENV || 'development';
console.log(`Building with NODE_ENV: ${mode}`);

// https://vitejs.dev/config
export default defineConfig({
  mode,
  base: './',
  build: {
    outDir: '.vite/renderer',
    assetsDir: '.',
    minify: process.env.NODE_ENV !== 'development',
    sourcemap: process.env.NODE_ENV === 'development',
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
  },  define: {
    global: 'globalThis',
    __dirname: 'undefined',
    __filename: 'undefined',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
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
