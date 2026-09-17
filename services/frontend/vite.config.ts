import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { proxy: { '/v1': 'http://localhost:8080' } },
  build: { outDir: 'dist' },
});
