// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Save, Shield, Key, Server, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Settings({ toast }) {
  const [settings, setSettings] = useState({
    auth_token: 'super',
    log_level: 'info',
    max_log_entries: 10000,
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

        {/* Claude Code env snippet */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🤖 Claude Code — Environment Setup</div>
            <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(
              `ANTHROPIC_BASE_URL=http://127.0.0.1:8082\nANTHROPIC_AUTH_TOKEN=${token}\nCLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`,
              'Claude Code env'
            )}>
              {copied === 'Claude Code env' ? <CheckCircle size={13} /> : <Copy size={13} />} Copy
            </button>
          </div>
          <div className="card-body">
            <pre className="code-block" style={{ fontSize: 13, lineHeight: 2 }}>
{`ANTHROPIC_BASE_URL=http://127.0.0.1:8082
ANTHROPIC_AUTH_TOKEN=${token}
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
CLAUDE_CODE_AUTO_COMPACT_WINDOW=190000`}
            </pre>
          </div>
        </div>

        {/* Codex CLI snippet */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💻 Codex CLI — Environment Setup</div>
            <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(
              `CCP_CODEX_API_KEY=${token}\ncodex -c model_provider="ccp" -c model_providers.ccp.base_url="http://127.0.0.1:8082/v1" -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" -c model_providers.ccp.wire_api="responses"`,
              'Codex CLI env'
            )}>
              {copied === 'Codex CLI env' ? <CheckCircle size={13} /> : <Copy size={13} />} Copy
            </button>
          </div>
          <div className="card-body">
            <pre className="code-block" style={{ fontSize: 12, lineHeight: 2 }}>
{`CCP_CODEX_API_KEY=${token}

codex \\
  -c model_provider="ccp" \\
  -c model_providers.ccp.name="Claude Code Proxy" \\
  -c model_providers.ccp.base_url="http://127.0.0.1:8082/v1" \\
  -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" \\
  -c model_providers.ccp.wire_api="responses"`}
            </pre>
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
