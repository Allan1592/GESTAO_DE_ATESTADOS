import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(), 
      tailwindcss()
    ],
    // ISSO É VITAL: Faz o Windows encontrar os arquivos dentro do .EXE
    base: './', 
    
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    server: {
      // Mantemos a compatibilidade com o AI Studio, mas sem travar o build
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
