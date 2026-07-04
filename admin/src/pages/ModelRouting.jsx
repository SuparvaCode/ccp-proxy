import { useState, useEffect } from 'react';
import { Plus, Trash2, GitBranch, ArrowRight, ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders, useAsync } from '../lib/hooks.js';
const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

const CLAUDE_VARIANTS = [
  { value: 'opus', label: 'Claude Opus', desc: 'Most capable — complex tasks' },
  { value: 'sonnet', label: 'Claude Sonnet', desc: 'Balanced performance' },
  { value: 'haiku', label: 'Claude Haiku', desc: 'Fast & lightweight' },
  { value: 'default', label: 'Default (fallback)', desc: 'All unmatched models' },
];

function RouteRow({ route, providers, onDelete }) {
  const provider = providers.find(p => p.id === route.provider_id);
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{CLAUDE_VARIANTS.find(v => v.value === route.claude_variant)?.label || route.claude_variant}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{CLAUDE_VARIANTS.find(v => v.value === route.claude_variant)?.desc}</div>
      </td>
      <td><ArrowRight size={14} color="var(--text-muted)" /></td>
      <td>
        <span className={`badge badge-default provider-${route.provider_id}`}>{provider?.name || route.provider_id}</span>
      </td>
      <td>
        <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand-light)' }}>{route.model_id}</code>
      </td>
      <td>
        <span className="badge badge-default" style={{ fontVariantNumeric: 'tabular-nums' }}>P{route.priority}</span>
      </td>
      <td>
        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(route.id)}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

function AddRouteModal({ providers, onClose, onSave, toast }) {
  const [form, setForm] = useState({ claude_variant: 'sonnet', provider_id: '', model_id: '', priority: 0 });
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.provider_id) {
      api.getModels(form.provider_id).then(setModels).catch(() => setModels([]));
    }
  }, [form.provider_id]);

  const handleSave = async () => {
    if (!form.provider_id || !form.model_id) { toast.error('Select provider and model'); return; }
    setSaving(true);
    try {
      await api.saveRoute({ ...form, id: uuidv4 ? uuidv4() : `route_${Date.now()}`, enabled: 1 });
      toast.success('Route added');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3><GitBranch size={16} style={{ marginRight: 8 }} />Add Model Route</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Claude Variant</label>
            <select className="input select" value={form.claude_variant} onChange={e => setForm(f => ({ ...f, claude_variant: e.target.value }))}>
              {CLAUDE_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Provider</label>
            <select className="input select" value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value, model_id: '' }))}>
              <option value="">Select provider…</option>
              {providers.filter(p => p.enabled).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Model ID</label>
            {models.length > 0 ? (
              <select className="input select" value={form.model_id} onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}>
                <option value="">Select model…</option>
                {models.map(m => <option key={m.model_id} value={m.model_id}>{m.model_name || m.model_id}</option>)}
              </select>
            ) : (
              <input className="input input-mono" value={form.model_id} onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))} placeholder="e.g. gemini-1.5-pro or gpt-4o" />
            )}
            {form.provider_id && form.model_id && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                Proxy format: <code style={{ color: 'var(--brand-light)', fontFamily: 'var(--font-mono)' }}>{form.provider_id}/{form.model_id}</code>
              </div>
            )}
          </div>
          <div className="input-group">
            <label className="input-label">Priority (higher = preferred)</label>
            <input className="input" type="number" value={form.priority} min={0} max={100} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : <Plus size={13} />} Add Route
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModelRouting({ toast }) {
  const { data: providers } = useProviders();
  const { data: routes, loading, refetch } = useAsync(() => api.getRoutes(), []);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (id) => {
    try {
      await api.deleteRoute(id);
      toast.success('Route deleted');
      refetch();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Routing</h1>
          <p className="page-subtitle">Map Claude variants (Opus/Sonnet/Haiku) to specific provider models. Claude Code will use these routes automatically.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Route
        </button>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title"><GitBranch size={14} /> Direct Access</div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            You can also bypass routing and address any model directly:
          </p>
          <pre className="code-block" style={{ fontSize: 13, lineHeight: 1.8 }}>
{`anthropic.messages.create({
  model: "google/gemini-2.0-flash", // or "groq/llama-3.1-70b"
  ...
})`}
          </pre>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : !routes?.length ? (
        <div className="empty-state">
          <GitBranch className="empty-state-icon" />
          <div className="empty-state-title">No routes configured</div>
          <div className="empty-state-desc">Add a route to map Claude Opus/Sonnet/Haiku to your preferred provider and model.</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
            <Plus size={13} /> Add First Route
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Claude Variant</th>
                  <th></th>
                  <th>Provider</th>
                  <th>Model ID</th>
                  <th>Priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <RouteRow key={r.id} route={r} providers={providers || []} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddRouteModal providers={providers || []} onClose={() => setShowModal(false)} onSave={refetch} toast={toast} />
      )}
    </div>
  );
}
