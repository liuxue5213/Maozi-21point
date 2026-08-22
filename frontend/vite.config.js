import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // React Native Web 别名配置
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-linear-gradient': 'react-native-web-linear-gradient',
    },
    extensions: ['.web.js', '.js', '.jsx', '.json'],
  },
  server: {
    host: '0.0.0.0',
    port: 60210,
    proxy: {
      '/api': {
        target: 'http://localhost:60215',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:60215',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});
