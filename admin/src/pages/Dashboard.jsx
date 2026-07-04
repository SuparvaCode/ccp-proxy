// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Zap, Clock, AlertCircle, Plug, GitBranch, ArrowRight, TrendingUp } from 'lucide-react';
import { useSummary, useRealtime } from '../lib/hooks.js';
import { api } from '../lib/api.js';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function StatCard({ icon: Icon, label, value, sub, color = 'var(--brand-light)' }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-label">{label}</div>
        <div style={{ color, background: `${color}15`, padding: '6px', borderRadius: 8 }}>
          <Icon size={16} />
        </div>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ toast }) {
  const { data: summary, loading } = useSummary();
  const realtime = useRealtime();
  const [chartData, setChartData] = useState([]);
  const [modelStats, setModelStats] = useState([]);

  useEffect(() => {
    api.getStats({ days: 7 }).then(data => {
      const grouped = {};
      for (const row of data) {
        if (!grouped[row.date]) grouped[row.date] = { date: row.date, requests: 0, tokens: 0 };
        grouped[row.date].requests += row.requests;
        grouped[row.date].tokens += row.total_tokens;
      }
      setChartData(Object.values(grouped).slice(-7));
    }).catch(() => {});

    api.getModelStats().then(setModelStats).catch(() => {});
  }, []);

  const totalRPM = Object.values(realtime).reduce((s, v) => s + (v.requests_per_minute || 0), 0);
  const totalTPM = Object.values(realtime).reduce((s, v) => s + (v.total_tokens_per_minute || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview of your CCP proxy</p>
        </div>
        <Link to="/playground" className="btn btn-primary btn-sm">
          <Zap size={14} /> Open Playground
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid-4 mb-6">
        <StatCard icon={Activity} label="Total Requests" value={summary?.total_requests?.toLocaleString() ?? '0'} sub="All time" color="var(--brand-light)" />
        <StatCard icon={Zap} label="Total Tokens" value={summary?.total_tokens ? (summary.total_tokens / 1000).toFixed(1) + 'K' : '0'} sub="Input + Output" color="var(--success)" />
        <StatCard icon={Clock} label="Avg Latency" value={summary?.avg_latency_ms ? summary.avg_latency_ms + 'ms' : '0ms'} sub="Response time" color="var(--warning)" />
        <StatCard icon={AlertCircle} label="Errors" value={summary?.error_count ?? '0'} sub="Failed requests" color="var(--danger)" />
      </div>

      {/* Realtime + Config */}
      <div className="grid-2 mb-6" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><TrendingUp size={15} /> Requests (7 days)</div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="requests" stroke="var(--brand)" strokeWidth={2} fill="url(#reqGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Realtime + Quick config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Activity size={15} /> Realtime (this minute)</div>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-light)', fontVariantNumeric: 'tabular-nums' }}>{totalRPM}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Req/min</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{totalTPM.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tok/min</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: 13 }}>Quick Setup</div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="code-block" style={{ fontSize: 11 }}>
                ANTHROPIC_BASE_URL=http://127.0.0.1:8082{'\n'}
                ANTHROPIC_AUTH_TOKEN=super
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/providers" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <Plug size={12} /> Providers
                </Link>
                <Link to="/routing" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <GitBranch size={12} /> Routing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Usage Stats */}
      {modelStats.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <div className="card-title"><GitBranch size={14} /> Top Models (Tokens & Requests)</div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={modelStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="model_id" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="var(--success)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--brand-light)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                <Bar yAxisId="left" dataKey="total_tokens" name="Total Tokens" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="requests" name="Total Requests" fill="var(--brand-light)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Provider realtime rows */}
      {Object.keys(realtime).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Provider Activity (this minute)</div>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Requests/min</th>
                  <th>Input Tokens/min</th>
                  <th>Output Tokens/min</th>
                  <th>Resets At</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(realtime).map(([pid, w]) => (
                  <tr key={pid}>
                    <td><span className={`badge badge-default provider-${pid}`}>{pid}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.requests_per_minute}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.input_tokens_per_minute.toLocaleString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.output_tokens_per_minute.toLocaleString()}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(w.window_reset_at).toLocaleTimeString()}</td>
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
