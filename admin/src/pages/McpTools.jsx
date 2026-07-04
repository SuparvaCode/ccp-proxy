// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Copy, Check, Wrench, Globe, Terminal, Wifi, Search, FolderOpen, Monitor, Zap } from 'lucide-react';
import { api } from '../lib/api.js';

// ── Templates ──────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'brave-search',
    label: 'Brave Search',
    icon: '🔍',
    description: 'Web search via Brave Search API',
    category: 'search',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '' },
    url: '',
  },
  {
    id: 'filesystem',
    label: 'Filesystem',
    icon: '📁',
    description: 'Read/write local files and directories',
    category: 'files',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    url: '',
  },
  {
    id: 'puppeteer',
    label: 'Puppeteer Browser',
    icon: '🌐',
    description: 'Full browser automation and page scraping',
    category: 'browser',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: {},
    url: '',
  },
  {
    id: 'fetch',
    label: 'HTTP Fetch',
    icon: '⚡',
    description: 'Fetch any URL and return its text content',
    category: 'web',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    env: {},
    url: '',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: '🐙',
    description: 'Search repos, read files, manage issues and PRs',
    category: 'dev',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    url: '',
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    icon: '🐘',
    description: 'Read-only database queries on a PostgreSQL database',
    category: 'database',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
    env: {},
    url: '',
  },
  {
    id: 'memory',
    label: 'Memory / Knowledge Graph',
    icon: '🧠',
    description: 'Persistent in-memory knowledge graph across sessions',
    category: 'memory',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {},
    url: '',
  },
  {
    id: 'custom-sse',
    label: 'Custom SSE Server',
    icon: '📡',
    description: 'Connect to any MCP server via SSE transport',
    category: 'custom',
    type: 'sse',
    command: '',
    args: [],
    env: {},
    url: 'http://localhost:3001/sse',
  },
];

const CATEGORY_LABELS = {
  search: 'Web Search', files: 'File System', browser: 'Browser',
  web: 'HTTP', dev: 'Development', database: 'Database',
  memory: 'Memory', custom: 'Custom',
};

const CATEGORY_COLORS = {
  search: '#f59e0b', files: '#3b82f6', browser: '#8b5cf6',
  web: '#06b6d4', dev: '#10b981', database: '#ec4899',
  memory: '#f97316', custom: '#6b7280',
};

function emptyTool() {
  return { name: '', description: '', category: 'custom', type: 'stdio', command: '', args: [], url: '', env: {}, enabled: true };
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function McpModal({ tool, onClose, onSave, toast }) {
  const [form, setForm] = useState(tool ? { ...tool } : emptyTool());
  const [argsText, setArgsText] = useState((tool?.args || []).join('\n'));
  const [envText, setEnvText] = useState(
    Object.entries(tool?.env || {}).map(([k, v]) => `${k}=${v}`).join('\n')
  );
  const [saving, setSaving] = useState(false);

  const parseArgs = (txt) => txt.split('\n').map(s => s.trim()).filter(Boolean);
  const parseEnv = (txt) => {
    const obj = {};
    for (const line of txt.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return obj;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Tool name is required'); return; }
    if (form.type === 'stdio' && !form.command.trim()) { toast.error('Command is required for stdio type'); return; }
    if ((form.type === 'sse' || form.type === 'http') && !form.url.trim()) { toast.error('URL is required for SSE/HTTP type'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, args: parseArgs(argsText), env: parseEnv(envText) });
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3><Wrench size={16} style={{ marginRight: 8 }} />{tool?.id ? 'Edit MCP Tool' : 'Add MCP Tool'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Tool Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Brave Search" />
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <input className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this tool do?" />
          </div>

          {/* Transport type */}
          <div className="input-group">
            <label className="input-label">Transport Type</label>
            <select className="input select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="stdio">stdio — Launch a local process (npx, node, python…)</option>
              <option value="sse">sse — Connect to a remote SSE server</option>
              <option value="http">http — Connect to a remote HTTP server</option>
            </select>
          </div>

          {/* stdio fields */}
          {form.type === 'stdio' && (
            <>
              <div className="input-group">
                <label className="input-label">Command *</label>
                <input className="input input-mono" value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} placeholder="npx  or  node  or  python3" />
              </div>
              <div className="input-group">
                <label className="input-label">Arguments <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(one per line)</span></label>
                <textarea
                  className="input input-mono"
                  rows={4}
                  value={argsText}
                  onChange={e => setArgsText(e.target.value)}
                  placeholder={'-y\n@modelcontextprotocol/server-brave-search'}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}
                />
              </div>
            </>
          )}

          {/* sse/http fields */}
          {(form.type === 'sse' || form.type === 'http') && (
            <div className="input-group">
              <label className="input-label">Server URL *</label>
              <input className="input input-mono" value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="http://localhost:3001/sse" />
            </div>
          )}

          {/* Environment variables */}
          <div className="input-group">
            <label className="input-label">Environment Variables <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(KEY=value, one per line)</span></label>
            <textarea
              className="input input-mono"
              rows={3}
              value={envText}
              onChange={e => setEnvText(e.target.value)}
              placeholder={'BRAVE_API_KEY=your_key_here\nANOTHER_VAR=value'}
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}
            />
          </div>

          {/* Enabled toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Include in generated config</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : null} Save Tool
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Config Preview Modal ───────────────────────────────────────────────────────
function ConfigModal({ config, onClose }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify({ mcpServers: config }, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h3>📋 Claude Code Config Snippet</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Add this to your <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>~/.claude.json</code> file (merge with existing <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>mcpServers</code> object if present):
          </p>
          <pre style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px', fontSize: 12,
            fontFamily: 'var(--font-mono)', overflowX: 'auto',
            lineHeight: 1.7, color: 'var(--text-primary)', maxHeight: 400, overflow: 'auto',
          }}>{json}</pre>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-sm" onClick={copy}>
            {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy to Clipboard</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function McpTools({ toast }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTool, setEditingTool] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [mcpConfig, setMcpConfig] = useState({});
  const [fromTemplate, setFromTemplate] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [toggling, setToggling] = useState({});

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try { setTools(await api.getMcpTools()); } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const handleSave = async (data) => {
    await api.saveMcpTool(data);
    toast.success(`${data.name} saved`);
    fetchTools();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try { await api.deleteMcpTool(id); toast.success(`${name} removed`); fetchTools(); }
    catch (e) { toast.error(e.message); }
    finally { setDeleting(d => ({ ...d, [id]: false })); }
  };

  const handleToggle = async (tool) => {
    setToggling(t => ({ ...t, [tool.id]: true }));
    try {
      await api.saveMcpTool({ ...tool, enabled: !tool.enabled });
      fetchTools();
    } catch (e) { toast.error(e.message); }
    finally { setToggling(t => ({ ...t, [tool.id]: false })); }
  };

  const handleShowConfig = async () => {
    try { setMcpConfig(await api.getMcpConfig()); setShowConfig(true); }
    catch (e) { toast.error(e.message); }
  };

  const useTemplate = (tpl) => {
    setFromTemplate({ ...tpl, id: undefined, name: tpl.label });
    setShowAdd(true);
  };

  const typeIcon = (type) => {
    if (type === 'stdio') return <Terminal size={12} />;
    if (type === 'sse') return <Wifi size={12} />;
    return <Globe size={12} />;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">MCP Tools</h1>
          <p className="page-subtitle">Manage Model Context Protocol servers for Claude Code — web search, file access, browsers, APIs and more</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleShowConfig}>
            <Copy size={13} /> Get Config
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setFromTemplate(null); setShowAdd(true); }}>
            <Plus size={13} /> Add Tool
          </button>
        </div>
      </div>

      {/* Active tools */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title"><Wrench size={15} /> Configured Tools ({tools.length})</div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
          ) : tools.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No tools configured yet — add one from the templates below or click <strong>Add Tool</strong>.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Category', 'Type', 'Command / URL', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map(tool => (
                  <tr key={tool.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{tool.name}</div>
                      {tool.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tool.description}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: `${CATEGORY_COLORS[tool.category] || '#6b7280'}22`,
                        color: CATEGORY_COLORS[tool.category] || '#6b7280',
                        border: `1px solid ${CATEGORY_COLORS[tool.category] || '#6b7280'}44`,
                      }}>
                        {CATEGORY_LABELS[tool.category] || tool.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {typeIcon(tool.type)} {tool.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {tool.type === 'stdio'
                          ? [tool.command, ...(tool.args || [])].join(' ').slice(0, 60) + ([tool.command, ...(tool.args || [])].join(' ').length > 60 ? '…' : '')
                          : tool.url}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!!tool.enabled}
                          disabled={!!toggling[tool.id]}
                          onChange={() => handleToggle(tool)}
                        />
                        <span className="toggle-track" />
                      </label>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit"
                          onClick={() => { setEditingTool(tool); setShowAdd(false); }}
                        ><Edit2 size={14} /></button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete"
                          style={{ color: 'var(--danger)' }}
                          disabled={!!deleting[tool.id]}
                          onClick={() => handleDelete(tool.id, tool.name)}
                        >{deleting[tool.id] ? <span className="spinner" /> : <Trash2 size={14} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Config hint */}
      {tools.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(96,165,250,0.25)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Zap size={16} style={{ color: 'var(--info)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--info)', marginBottom: 6 }}>How to activate in Claude Code</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                Click <strong>Get Config</strong> above to generate the <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>mcpServers</code> JSON block, then add it to{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>~/.claude.json</code>.
                Restart Claude Code after saving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick-add templates */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Zap size={15} /> Quick-Add Templates</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                onClick={() => useTemplate(tpl)}
                style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                  transition: 'all 0.18s', display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{tpl.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{tpl.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tpl.description}</div>
                  <span style={{
                    display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600,
                    padding: '1px 7px', borderRadius: 20,
                    background: `${CATEGORY_COLORS[tpl.category] || '#6b7280'}22`,
                    color: CATEGORY_COLORS[tpl.category] || '#6b7280',
                  }}>
                    {CATEGORY_LABELS[tpl.category]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editingTool) && (
        <McpModal
          tool={editingTool || fromTemplate}
          onClose={() => { setShowAdd(false); setEditingTool(null); setFromTemplate(null); }}
          onSave={handleSave}
          toast={toast}
        />
      )}

      {/* Config Preview Modal */}
      {showConfig && (
        <ConfigModal config={mcpConfig} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
