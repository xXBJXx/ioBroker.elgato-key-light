import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: '../admin',
        emptyOutDir: false,
        assetsDir: 'tab-assets',
        sourcemap: false,
        rollupOptions: { input: 'tab_m.html' },
    },
});
