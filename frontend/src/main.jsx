/**
 * 帽子21点 - 入口文件 (React Native Web)
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/Toast';

// React Native Web 全局样式
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background: #f8f9fa;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  /* RNW 需要的滚动行为 */
  body { overscroll-behavior: none; }
`;
document.head.appendChild(globalStyle);

const container = document.getElementById('root');
createRoot(container).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
