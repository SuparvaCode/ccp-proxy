// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Save, Shield, Key, Server, Eye, EyeOff, Copy, CheckCircle, SlidersHorizontal, Info } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Settings({ toast }) {
  const [settings, setSettings] = useState({
    auth_token: 'super',
    log_level: 'info',
    max_log_entries: 10000,
    model_max_tokens: 8192,
    model_max_tokens_override: false,
    model_temperature_enabled: false,
    model_temperature: 1,
    model_top_p_enabled: false,
    model_top_p: 1,
    model_top_k_enabled: false,
    model_top_k: 40,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api.getSettings()
      .then(s => { setSettings(prev => ({ ...prev, ...s })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings.auth_token?.trim()) { toast.error('Auth token cannot be empty'); return; }
    setSaving(true);
    try {
      await api.saveSettings(settings);
      toast.success('Settings saved — token is live immediately');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopied(''), 2000);
  };

  const token = settings.auth_token || 'super';

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure proxy authentication, logging, and server options</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : <Save size={13} />} Save Settings
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

        {/* Auth Token */}
        <div className="card" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
          <div className="card-header">
            <div className="card-title"><Shield size={15} /> Proxy Auth Token</div>
            <span className="badge badge-brand">Live — no restart needed</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              This token must be set as <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>ANTHROPIC_AUTH_TOKEN</code> in your Claude Code or Codex environment.
              Changing it here takes effect immediately for all new requests.
            </p>
            <div className="input-group">
              <label className="input-label">Auth Token (default: <code style={{ fontFamily: 'var(--font-mono)' }}>super</code>)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  className="input input-mono"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setSettings(s => ({ ...s, auth_token: e.target.value }))}
                  style={{ paddingRight: 80 }}
                  placeholder="super"
                />
                <div style={{ position: 'absolute', right: 8, display: 'flex', gap: 4 }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
                    onClick={() => setShowToken(v => !v)}
                    title={showToken ? 'Hide' : 'Show'}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'token' ? 'var(--success)' : 'var(--text-muted)', padding: 4, display: 'flex' }}
                    onClick={() => copyToClipboard(token, 'token')}
                    title="Copy token"
                  >
                    {copied === 'token' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Model Parameters */}
        <div className="card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
          <div className="card-header">
            <div className="card-title"><SlidersHorizontal size={15} /> Global Model Parameters</div>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>Live — no restart needed</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              These values are injected into every proxied request. Toggle each parameter on to enable it.
              Disabled parameters are not sent — the model uses its own defaults.
            </p>

            {/* Max Tokens */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Max Output Tokens</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Maximum tokens the model can generate per response</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Always override</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={!!settings.model_max_tokens_override}
                      onChange={e => setSettings(s => ({ ...s, model_max_tokens_override: e.target.checked }))} />
                    <span className="toggle-track" />
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={256} max={128000} step={256}
                  value={settings.model_max_tokens || 8192}
                  onChange={e => setSettings(s => ({ ...s, model_max_tokens: parseInt(e.target.value) }))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }} />
                <input type="number" min={1} max={200000}
                  value={settings.model_max_tokens || 8192}
                  onChange={e => setSettings(s => ({ ...s, model_max_tokens: parseInt(e.target.value) || 8192 }))}
                  className="input" style={{ width: 90, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Info size={11} />
                {settings.model_max_tokens_override
                  ? 'Always replaces what the client sends.'
                  : 'Only applied when the client request has no max_tokens set.'}
              </div>
            </div>

            {/* Temperature */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${settings.model_temperature_enabled ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settings.model_temperature_enabled ? 12 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    Temperature
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {settings.model_temperature_enabled ? Number(settings.model_temperature ?? 1).toFixed(2) : 'disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Controls randomness. 0 = deterministic, 2 = very creative. Not all providers accept values &gt; 1.</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!settings.model_temperature_enabled}
                    onChange={e => setSettings(s => ({ ...s, model_temperature_enabled: e.target.checked }))} />
                  <span className="toggle-track" />
                </label>
              </div>
              {settings.model_temperature_enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0</span>
                  <input type="range" min={0} max={2} step={0.01}
                    value={settings.model_temperature ?? 1}
                    onChange={e => setSettings(s => ({ ...s, model_temperature: parseFloat(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#f59e0b' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>2</span>
                  <input type="number" min={0} max={2} step={0.01}
                    value={settings.model_temperature ?? 1}
                    onChange={e => setSettings(s => ({ ...s, model_temperature: parseFloat(e.target.value) || 1 }))}
                    className="input" style={{ width: 70, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>
              )}
            </div>

            {/* Top P */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${settings.model_top_p_enabled ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settings.model_top_p_enabled ? 12 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    Top P
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {settings.model_top_p_enabled ? Number(settings.model_top_p ?? 1).toFixed(2) : 'disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Nucleus sampling — sample from top P% probability mass. Most providers support this.</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!settings.model_top_p_enabled}
                    onChange={e => setSettings(s => ({ ...s, model_top_p_enabled: e.target.checked }))} />
                  <span className="toggle-track" />
                </label>
              </div>
              {settings.model_top_p_enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0</span>
                  <input type="range" min={0} max={1} step={0.01}
                    value={settings.model_top_p ?? 1}
                    onChange={e => setSettings(s => ({ ...s, model_top_p: parseFloat(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>1</span>
                  <input type="number" min={0} max={1} step={0.01}
                    value={settings.model_top_p ?? 1}
                    onChange={e => setSettings(s => ({ ...s, model_top_p: parseFloat(e.target.value) || 1 }))}
                    className="input" style={{ width: 70, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>
              )}
            </div>

            {/* Top K */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${settings.model_top_k_enabled ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settings.model_top_k_enabled ? 12 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    Top K
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {settings.model_top_k_enabled ? (settings.model_top_k ?? 40) : 'disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sample from top K tokens only. Supported by Ollama, Gemini, llama.cpp. Not accepted by OpenAI-style APIs.</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!settings.model_top_k_enabled}
                    onChange={e => setSettings(s => ({ ...s, model_top_k_enabled: e.target.checked }))} />
                  <span className="toggle-track" />
                </label>
              </div>
              {settings.model_top_k_enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>1</span>
                  <input type="range" min={1} max={200} step={1}
                    value={settings.model_top_k ?? 40}
                    onChange={e => setSettings(s => ({ ...s, model_top_k: parseInt(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#8b5cf6' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>200</span>
                  <input type="number" min={1} max={1000} step={1}
                    value={settings.model_top_k ?? 40}
                    onChange={e => setSettings(s => ({ ...s, model_top_k: parseInt(e.target.value) || 40 }))}
                    className="input" style={{ width: 70, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Claude Code env snippet */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🤖 Claude Code — Environment Setup</div>
            <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(
              `export ANTHROPIC_BASE_URL=http://127.0.0.1:${settings.port || 8082}\nexport ANTHROPIC_AUTH_TOKEN=${token}\nexport CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`,
              'Claude Code env'
            )}>
              {copied === 'Claude Code env' ? <CheckCircle size={13} /> : <Copy size={13} />} Copy
            </button>
          </div>
          <div className="card-body">
            <pre className="code-block" style={{ fontSize: 13, lineHeight: 2 }}>
{`export ANTHROPIC_BASE_URL=http://127.0.0.1:${settings.port || 8082}
export ANTHROPIC_AUTH_TOKEN=${token}
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
export CLAUDE_CODE_AUTO_COMPACT_WINDOW=190000`}
            </pre>
          </div>
        </div>

        {/* Codex CLI snippet */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💻 Codex CLI — Environment Setup</div>
            <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(
              `export CCP_CODEX_API_KEY=${token}\ncodex -c model_provider="ccp" -c model_providers.ccp.base_url="http://127.0.0.1:${settings.port || 8082}/v1" -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" -c model_providers.ccp.wire_api="responses"`,
              'Codex CLI env'
            )}>
              {copied === 'Codex CLI env' ? <CheckCircle size={13} /> : <Copy size={13} />} Copy
            </button>
          </div>
          <div className="card-body">
            <pre className="code-block" style={{ fontSize: 12, lineHeight: 2 }}>
{`export CCP_CODEX_API_KEY=${token}

codex \\
  -c model_provider="ccp" \\
  -c model_providers.ccp.name="Claude Code Proxy" \\
  -c model_providers.ccp.base_url="http://127.0.0.1:${settings.port || 8082}/v1" \\
  -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" \\
  -c model_providers.ccp.wire_api="responses"`}
            </pre>
          </div>
        </div>

        {/* Server Management */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
          <div className="card-header">
            <div className="card-title"><Server size={15} /> Server Management</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Server Port (requires restart to apply)</label>
              <input
                className="input"
                type="number"
                value={settings.port || 8082}
                min={1}
                max={65535}
                onChange={e => setSettings(s => ({ ...s, port: parseInt(e.target.value) || 8082 }))}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const s = await api.getSettings();
                    setSettings(prev => ({ ...prev, ...s }));
                    toast.success('Settings refreshed from server');
                  } catch (e) {
                    toast.error('Failed to refresh: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Refresh Settings
              </button>
              
              <button 
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (confirm('Are you sure you want to restart the proxy server?')) {
                    try {
                      const data = await api.saveSettings(settings);
                      toast.info('Restarting server process...');
                      
                      // Trigger restart
                      const res = await fetch('/api/admin/server/restart', { method: 'POST' });
                      const restData = await res.json();
                      toast.success(restData.message || 'Server restarting...');
                      
                      // Wait 3 seconds then refresh window
                      setTimeout(() => {
                        window.location.reload();
                      }, 3000);
                    } catch (e) {
                      toast.error('Failed to initiate restart: ' + e.message);
                    }
                  }
                }}
              >
                Restart Server
              </button>
            </div>
          </div>
        </div>

        {/* Logging */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Server size={15} /> Logging & Storage</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Log Level</label>
              <select
                className="input select"
                value={settings.log_level || 'info'}
                onChange={e => setSettings(s => ({ ...s, log_level: e.target.value }))}
              >
                <option value="debug">Debug (verbose)</option>
                <option value="info">Info (default)</option>
                <option value="warn">Warn</option>
                <option value="error">Error only</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Max Log Entries (older entries pruned automatically)</label>
              <input
                className="input"
                type="number"
                value={settings.max_log_entries || 10000}
                min={100}
                max={100000}
                onChange={e => setSettings(s => ({ ...s, max_log_entries: parseInt(e.target.value) || 10000 }))}
              />
            </div>
          </div>
        </div>

        {/* Encryption notice */}
        <div className="card" style={{ borderColor: 'rgba(96,165,250,0.25)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Key size={16} style={{ color: 'var(--info)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--info)', marginBottom: 6 }}>AES-256 API Key Encryption</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  All provider API keys are encrypted at rest using AES-256-CBC with a configurable master secret.<br />
                  Set <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>CCP_ENCRYPTION_SECRET</code> in <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>server/.env</code> (min 32 chars) for production. The default secret is insecure — change it.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
