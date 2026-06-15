import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

type VitestConfig = {
  environment: 'jsdom';
  globals: boolean;
  setupFiles: string;
  css: boolean;
};

type AppViteConfig = UserConfig & {
  test: VitestConfig;
};

const config: AppViteConfig = {
  base: './',
  plugins: [react()],
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ['pdf-lib', 'exif-js'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
  },
};

export default defineConfig(config);
