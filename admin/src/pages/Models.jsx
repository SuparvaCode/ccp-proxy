import { useState, useEffect } from 'react';
import { Search, RefreshCw, Cpu, Copy } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders } from '../lib/hooks.js';

export default function Models({ toast }) {
  const { data: providers } = useProviders();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);

  const enabledProviders = providers?.filter(p => p.enabled) || [];

  useEffect(() => {
    if (selectedProvider) loadModels(selectedProvider);
  }, [selectedProvider]);

  const loadModels = async (pid) => {
    setLoading(true);
    try {
      const data = await api.getModels(pid);
      setModels(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!selectedProvider) return;
    setFetching(true);
    try {
      const r = await api.fetchModels(selectedProvider);
      // Normalize to match db schema (model_id, model_name)
      const normalized = (r.models || []).map(m => ({
        model_id: m.id,
        model_name: m.name || m.id,
        context_length: m.context_length,
      }));
      setModels(normalized);
      toast.success(`Fetched ${r.models?.length || 0} models`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(`${selectedProvider}/${id}`);
    toast.success('Copied to clipboard!');
  };

  const filtered = models.filter(m => {
    const mId = m.model_id || m.id || '';
    const mName = m.model_name || m.name || '';
    return mId.toLowerCase().includes(search.toLowerCase()) ||
           mName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Browser</h1>
          <p className="page-subtitle">Browse available models. Copy <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{'{PROVIDER}/{MODEL_ID}'}</code> format for use in Claude Code.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          className="input select"
          style={{ maxWidth: 240 }}
          value={selectedProvider}
          onChange={e => setSelectedProvider(e.target.value)}
        >
          <option value="">Select a provider…</option>
          {enabledProviders.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={handleFetch} disabled={!selectedProvider || fetching}>
          {fetching ? <span className="spinner" /> : <RefreshCw size={13} />}
          Fetch Models
        </button>

        {models.length > 0 && (
          <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <Search className="search-icon" />
            <input className="input" style={{ paddingLeft: 34 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models…" />
          </div>
        )}

        {models.length > 0 && (
          <span className="badge badge-brand">{filtered.length} models</span>
        )}
      </div>

      {!selectedProvider ? (
        <div className="empty-state">
          <Cpu className="empty-state-icon" size={48} />
          <div className="empty-state-title">Select a provider to view models</div>
          <div className="empty-state-desc">Enable providers on the Providers page first, then fetch their available models.</div>
        </div>
      ) : loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Cpu className="empty-state-icon" />
          <div className="empty-state-title">No models cached</div>
          <div className="empty-state-desc">Click "Fetch Models" to load available models from this provider.</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Model ID</th>
                  <th>Display Name</th>
                  <th>Context Length</th>
                  <th>Proxy Format</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const mId = m.model_id || m.id;
                  const mName = m.model_name || m.name || mId;
                  return (
                    <tr key={mId}>
                      <td>
                        <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand-light)' }}>{mId}</code>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{mName}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.context_length ? (m.context_length / 1000).toFixed(0) + 'K' : '—'}
                      </td>
                      <td>
                        <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 5 }}>
                          {selectedProvider}/{mId}
                        </code>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copyId(mId)} title="Copy proxy format">
                          <Copy size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
