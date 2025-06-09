import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(({ mode }) => ({
  define: {
    // Only define dev server URL in development mode
    MAIN_WINDOW_VITE_DEV_SERVER_URL: mode === 'development' 
      ? JSON.stringify('http://localhost:5173/') 
      : 'undefined',
    MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window'),
  },
  build: {
    outDir: '.vite/build',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    sourcemap: process.env.MODE === 'development',
  },
}));
