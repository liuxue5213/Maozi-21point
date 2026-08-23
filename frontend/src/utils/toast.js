/**
 * 帽子21点 - 全局提示工具
 * 替代 window.alert
 */

let toastHandler = null;

export const setToastHandler = (handler) => {
  toastHandler = handler;
};

export const toast = {
  success: (msg) => toastHandler?.(msg, 'success'),
  error: (msg) => toastHandler?.(msg, 'error'),
  warning: (msg) => toastHandler?.(msg, 'warning'),
  info: (msg) => toastHandler?.(msg, 'info'),
};
