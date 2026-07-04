import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders } from '../lib/hooks.js';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#34d399', '#f59e0b', '#ec4899', '#60a5fa', '#84cc16'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span><strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Analytics({ toast }) {
  const { data: providers } = useProviders();
  const [stats, setStats] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getStats({ days }).then(setStats).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [days]);

  // Aggregate by date
  const byDate = {};
  for (const r of stats) {
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, requests: 0, tokens: 0, errors: 0, avg_latency: [] };
    byDate[r.date].requests += r.requests;
    byDate[r.date].tokens += r.total_tokens;
    byDate[r.date].errors += r.errors;
    if (r.avg_latency) byDate[r.date].avg_latency.push(r.avg_latency);
  }
  const dateData = Object.values(byDate).map(d => ({
    ...d,
    avg_latency: d.avg_latency.length ? Math.round(d.avg_latency.reduce((a, b) => a + b, 0) / d.avg_latency.length) : 0,
  }));

  // Aggregate by provider for pie chart
  const byProvider = {};
  for (const r of stats) {
    if (!byProvider[r.provider_id]) byProvider[r.provider_id] = { name: r.provider_id, value: 0 };
    byProvider[r.provider_id].value += r.requests;
  }
  const pieData = Object.values(byProvider).filter(p => p.value > 0);

  // Token chart by date
  const tokenData = dateData.map(d => ({ date: d.date, Tokens: d.tokens, Requests: d.requests }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Usage trends, token consumption, and provider distribution</p>
        </div>
        <select className="input select" style={{ maxWidth: 140 }} value={days} onChange={e => setDays(parseInt(e.target.value))}>
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : stats.length === 0 ? (
        <div className="empty-state">
          <BarChart3 className="empty-state-icon" />
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-desc">Usage data will appear here after routing requests through the proxy.</div>
        </div>
      ) : (
        <>
          {/* Requests + Tokens over time */}
          <div className="grid-2 mb-6">
            <div className="card">
              <div className="card-header"><div className="card-title">Requests / Day</div></div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dateData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reqGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="requests" name="Requests" stroke="#8b5cf6" strokeWidth={2} fill="url(#reqGrad2)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Tokens / Day</div></div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tokenData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Tokens" fill="#34d399" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Latency chart */}
            <div className="card">
              <div className="card-header"><div className="card-title">Avg Latency (ms)</div></div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dateData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="avg_latency" name="Latency (ms)" stroke="#f97316" strokeWidth={2} fill="url(#latGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Provider distribution */}
            <div className="card">
              <div className="card-header"><div className="card-title">Provider Distribution</div></div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 8 }}>
                <ResponsiveContainer width={140} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieData.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{p.name}</span>
                      <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{p.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
