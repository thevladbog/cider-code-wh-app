import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify('http://localhost:5173/'),
    MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window'),
  },
  build: {
    outDir: '.vite/build',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    sourcemap: process.env.MODE === 'development',
  },
});
