// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, [execute]);
  return { data, loading, error, refetch: execute };
}

export function useProviders() {
  return useAsync(() => api.getProviders(), []);
}

export function useSummary() {
  const { data, loading, error, refetch } = useAsync(() => api.getSummary(), []);
  // Poll every 5s
  useEffect(() => {
    const id = setInterval(refetch, 5000);
    return () => clearInterval(id);
  }, [refetch]);
  return { data, loading, error, refetch };
}

export function useRealtime() {
  const [data, setData] = useState({});
  useEffect(() => {
    const fetch = () => api.getRealtime().then(setData).catch(() => {});
    fetch();
    const id = setInterval(fetch, 2000);
    return () => clearInterval(id);
  }, []);
  return data;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ccp-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ccp-theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  return {
    toasts,
    toast: {
      success: (m) => add(m, 'success'),
      error: (m) => add(m, 'error'),
      warning: (m) => add(m, 'warning'),
      info: (m) => add(m, 'info'),
    },
    removeToast: (id) => setToasts(t => t.filter(x => x.id !== id)),
  };
}
