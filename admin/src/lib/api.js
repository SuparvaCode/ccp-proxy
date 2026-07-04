// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

const BASE = '/api/admin';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Providers
  getProviders: () => req('GET', '/providers'),
  getProvider: (id) => req('GET', `/providers/${id}`),
  saveProvider: (id, data) => req('PUT', `/providers/${id}`, data),
  deleteProvider: (id) => req('DELETE', `/providers/${id}`),
  testProvider: (id) => req('POST', `/providers/${id}/test`),
  fetchModels: (id) => req('POST', `/providers/${id}/fetch-models`),
  getModels: (id) => req('GET', `/providers/${id}/models`),

  // Model routes
  getRoutes: () => req('GET', '/model-routes'),
  saveRoute: (data) => req('PUT', `/model-routes/${data.id || ''}`, data),
  deleteRoute: (id) => req('DELETE', `/model-routes/${id}`),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/logs?${q}`);
  },
  clearLogs: () => req('DELETE', '/logs'),

  // Stats
  getStats: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/stats?${q}`);
  },
  getRealtime: () => req('GET', '/stats/realtime'),
  getSummary: () => req('GET', '/stats/summary'),
  getModelStats: () => req('GET', '/stats/models'),

  // Settings
  getSettings: () => req('GET', '/settings'),
  saveSettings: (data) => req('PUT', '/settings', data),

  // Playground
  playground: (data) => req('POST', '/playground', data),

  // MCP Tools
  getMcpTools: () => req('GET', '/mcp-tools'),
  saveMcpTool: (data) => req('PUT', `/mcp-tools/${data.id || ''}`, data),
  deleteMcpTool: (id) => req('DELETE', `/mcp-tools/${id}`),
  getMcpConfig: () => req('GET', '/mcp-config'),

  // Streaming playground
  playgroundStream: async (data, onChunk, onDone, onError) => {
    try {
      const res = await fetch(`${BASE}/playground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stream: true }),
      });
      if (!res.ok) { onError(new Error(await res.text())); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const evt = JSON.parse(data);
              onChunk(evt);
            } catch {}
          }
        }
      }
      onDone();
    } catch (e) {
      onError(e);
    }
  },
};
