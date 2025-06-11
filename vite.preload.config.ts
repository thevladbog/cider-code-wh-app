import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: 'src/preload.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
  define: {
    __dirname: 'import.meta.dirname',
    // Pass NODE_ENV to the preload process runtime
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // Pass APP_VERSION to the preload process runtime
    'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || ''),
  },
});
