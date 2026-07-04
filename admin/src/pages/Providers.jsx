import { useState, useEffect } from 'react';
import { Plus, Plug, Eye, EyeOff, Trash2, RefreshCw, CheckCircle, XCircle, Edit2, Globe, Cpu } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders } from '../lib/hooks.js';

const PROVIDER_ICONS = {
  google: '🟦', deepseek: '🔵', openrouter: '🟣', groq: '🟠', mistral: '🟡',
  codestral: '🟡', cerebras: '🩷', fireworks: '🔴', nvidia: '🟢', together: '🔵',
  xai: '⚫', cohere: '🟩', ollama: '🦙', lmstudio: '🎛️', llamacpp: '🦎', bedrock: '☁️',
};

function ProviderModal({ provider, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    name: provider?.name || '',
    base_url: provider?.base_url || '',
    api_key: '',
    enabled: provider?.enabled ?? 1,
    extra_config: provider?.extra_config || {},
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveProvider(provider.id, { ...form, id: provider.id });
      toast.success(`${provider.name} saved`);
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first then test so backend has the keys
      await api.saveProvider(provider.id, { ...form, id: provider.id });
      const r = await api.testProvider(provider.id);
      setTestResult(r);
      toast.success(`Connection OK — ${r.model_count} models found`);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{PROVIDER_ICONS[provider.id]} {provider.name}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {provider.id === 'bedrock' ? (
            <>
              <div className="input-group">
                <label className="input-label">Connection Mode</label>
                <select
                  className="input select"
                  value={form.extra_config?.use_openai_compat ? 'openai' : 'aws'}
                  onChange={e => {
                    const isOai = e.target.value === 'openai';
                    setForm(f => ({
                      ...f,
                      extra_config: { ...f.extra_config, use_openai_compat: isOai }
                    }));
                  }}
                >
                  <option value="aws">AWS IAM Credentials (Native Bedrock SDK)</option>
                  <option value="openai">OpenAI-Compatible Bearer Token (Gateway/Mantle)</option>
                </select>
              </div>

              {form.extra_config?.use_openai_compat ? (
                <>
                  <div className="input-group">
                    <label className="input-label">Base URL (e.g. Bedrock gateway proxy endpoint)</label>
                    <input 
                      className="input input-mono" 
                      value={form.base_url} 
                      onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} 
                      placeholder="https://your-bedrock-gateway.com/v1" 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">API Key / Bearer Token</label>
                    <div className="input-wrapper">
                      <input
                        className="input input-mono"
                        type={showKey ? 'text' : 'password'}
                        value={form.api_key}
                        onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                        placeholder="Leave blank to keep existing key"
                      />
                      <button className="input-suffix" style={{ pointerEvents: 'all', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="input-group">
                    <label className="input-label">AWS Region (e.g. us-east-1)</label>
                    <input 
                      className="input input-mono" 
                      value={form.extra_config?.aws_region || ''} 
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        extra_config: { ...f.extra_config, aws_region: e.target.value } 
                      }))} 
                      placeholder="us-east-1" 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">AWS Access Key ID</label>
                    <input 
                      className="input input-mono" 
                      value={form.extra_config?.aws_access_key_id || ''} 
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        extra_config: { ...f.extra_config, aws_access_key_id: e.target.value } 
                      }))} 
                      placeholder="AKIA..." 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">AWS Secret Access Key</label>
                    <div className="input-wrapper">
                      <input
                        className="input input-mono"
                        type={showKey ? 'text' : 'password'}
                        value={form.api_key}
                        onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                        placeholder="Leave blank to keep existing key"
                      />
                      <button className="input-suffix" style={{ pointerEvents: 'all', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">AWS Session Token (Optional)</label>
                    <input 
                      className="input input-mono" 
                      type="password"
                      value={form.extra_config?.aws_session_token || ''} 
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        extra_config: { ...f.extra_config, aws_session_token: e.target.value } 
                      }))} 
                      placeholder="Session token (if using temporary credentials)" 
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">Base URL</label>
                <input className="input input-mono" value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://api.provider.com" />
              </div>
              {provider.type === 'cloud' && (
                <div className="input-group">
                  <label className="input-label">API Key</label>
                  <div className="input-wrapper">
                    <input
                      className="input input-mono"
                      type={showKey ? 'text' : 'password'}
                      value={form.api_key}
                      onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                      placeholder="Leave blank to keep existing key"
                    />
                    <button className="input-suffix" style={{ pointerEvents: 'all', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked ? 1 : 0 }))} />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Provider Enabled</span>
          </div>

          {testResult && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${testResult.success ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, fontSize: 12, color: testResult.success ? 'var(--success)' : 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}>
              {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.success ? `✓ ${testResult.model_count} models available` : testResult.error}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing}>
            {testing ? <span className="spinner" /> : <RefreshCw size={13} />}
            Test Connection
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : null} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Providers({ toast }) {
  const { data: providers, loading, refetch } = useProviders();
  const [selected, setSelected] = useState(null);
  const [fetchingModels, setFetchingModels] = useState({});

  const handleFetchModels = async (pid, e) => {
    e.stopPropagation();
    setFetchingModels(f => ({ ...f, [pid]: true }));
    try {
      const r = await api.fetchModels(pid);
      toast.success(`Fetched ${r.models?.length || 0} models for ${pid}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetchingModels(f => ({ ...f, [pid]: false }));
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.saveProvider(p.id, { ...p, enabled: p.enabled ? 0 : 1 });
      toast.success(`${p.name} ${p.enabled ? 'disabled' : 'enabled'}`);
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  const cloud = providers?.filter(p => p.type === 'cloud') || [];
  const local = providers?.filter(p => p.type === 'local') || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Providers</h1>
          <p className="page-subtitle">Configure API keys and connection settings for each provider</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          {/* Cloud providers */}
          <h3 style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />Cloud Providers
          </h3>
          <div className="grid-3 mb-6">
            {cloud.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelected(p)}>
                <div className="card-body" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{PROVIDER_ICONS[p.id]}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {p.has_api_key ? '🔑 Key configured' : '⚠️ No key'}
                        </div>
                      </div>
                    </div>
                    <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={!!p.enabled} onChange={() => handleToggle(p)} />
                      <span className="toggle-track" />
                    </label>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.base_url}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={e => { e.stopPropagation(); setSelected(p); }}>
                      <Edit2 size={11} /> Configure
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={!p.enabled || fetchingModels[p.id]} onClick={e => handleFetchModels(p.id, e)} title="Fetch models">
                      {fetchingModels[p.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Local providers */}
          <h3 style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            <Cpu size={14} style={{ display: 'inline', marginRight: 6 }} />Local Providers
          </h3>
          <div className="grid-3">
            {local.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                <div className="card-body" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{PROVIDER_ICONS[p.id]}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <span className="badge badge-info" style={{ fontSize: 10, marginTop: 2 }}>Local</span>
                      </div>
                    </div>
                    <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={!!p.enabled} onChange={() => handleToggle(p)} />
                      <span className="toggle-track" />
                    </label>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>{p.base_url}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={e => { e.stopPropagation(); setSelected(p); }}>
                      <Edit2 size={11} /> Configure
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={!p.enabled || fetchingModels[p.id]} onClick={e => handleFetchModels(p.id, e)}>
                      {fetchingModels[p.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ProviderModal
          provider={selected}
          onClose={() => setSelected(null)}
          onSave={refetch}
          toast={toast}
        />
      )}
    </div>
  );
}
