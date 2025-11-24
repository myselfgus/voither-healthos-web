/**
 * Vite configuration for Landing Page build
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { resolve } from 'path';

import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    createIconImportProxy() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
      '@landing': resolve(projectRoot, 'landing'),
    },
  },
  build: {
    outDir: 'dist/landing',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(projectRoot, 'landing.html'),
      },
      output: {
        entryFileNames: 'assets/landing.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 3000,
  },
});
