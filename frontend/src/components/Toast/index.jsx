/**
 * 帽子21点 - Toast 提示组件
 * 替代 window.alert
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { View, Text, StyleSheet } from '../../rnw';

// Toast Context
const ToastContext = createContext({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View style={styles.container}>
          <View style={[styles.toast, styles[toast.type]]}>
            <Text style={styles.icon}>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </Text>
            <Text style={styles.message}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4a4540',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  success: { backgroundColor: '#6b9b6a' },
  error: { backgroundColor: '#c9584a' },
  warning: { backgroundColor: '#c4945c' },
  info: { backgroundColor: '#4a4540' },
  icon: { fontSize: 16 },
  message: { fontSize: 14, color: 'white', fontWeight: '500' },
});
