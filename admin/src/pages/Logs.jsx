import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Filter, ScrollText } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders } from '../lib/hooks.js';

function statusBadge(status) {
  if (status >= 500) return <span className="badge badge-danger">{status}</span>;
  if (status >= 400) return <span className="badge badge-warning">{status}</span>;
  return <span className="badge badge-success">{status}</span>;
}

export default function Logs({ toast }) {
  const { data: providers } = useProviders();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ provider_id: '', limit: 100 });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs(filter);
      setLogs(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [filter.provider_id, filter.limit]);

  const handleClear = async () => {
    if (!confirm('Clear all request logs?')) return;
    try {
      await api.clearLogs();
      toast.success('Logs cleared');
      setLogs([]);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Request Logs</h1>
          <p className="page-subtitle">Per-request history with token usage, latency, and status</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadLogs}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-danger btn-sm" onClick={handleClear}><Trash2 size={13} /> Clear</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <select className="input select" style={{ maxWidth: 200 }} value={filter.provider_id} onChange={e => setFilter(f => ({ ...f, provider_id: e.target.value }))}>
          <option value="">All Providers</option>
          {(providers || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input select" style={{ maxWidth: 120 }} value={filter.limit} onChange={e => setFilter(f => ({ ...f, limit: parseInt(e.target.value) }))}>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={200}>Last 200</option>
          <option value={500}>Last 500</option>
        </select>
        <span className="badge badge-default">{logs.length} entries</span>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <ScrollText className="empty-state-icon" />
          <div className="empty-state-title">No logs yet</div>
          <div className="empty-state-desc">Requests through the proxy will appear here with full token and latency data.</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Endpoint</th>
                  <th>In Tokens</th>
                  <th>Out Tokens</th>
                  <th>Latency</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td><span className={`badge badge-default provider-${log.provider_id}`}>{log.provider_id || '—'}</span></td>
                    <td><code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{log.model_id || '—'}</code></td>
                    <td><span className="badge badge-info">{log.endpoint || '—'}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(log.input_tokens || 0).toLocaleString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(log.output_tokens || 0).toLocaleString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <span style={{ color: log.latency_ms > 5000 ? 'var(--danger)' : log.latency_ms > 2000 ? 'var(--warning)' : 'var(--success)' }}>
                        {log.latency_ms}ms
                      </span>
                    </td>
                    <td>{statusBadge(log.status)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--danger)' }}>
                      {log.error_message || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
