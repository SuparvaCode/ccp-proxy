// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function Layout({ children, theme, toggleTheme }) {
  const [serverOnline, setServerOnline] = useState(false);

  useEffect(() => {
    const check = () => fetch('/api/admin/stats/summary', { signal: AbortSignal.timeout(2000) })
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="layout">
      <Sidebar serverOnline={serverOnline} />
      <div className="main-content">
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          backdropFilter: 'blur(12px)',
        }}>
          <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
            {`ANTHROPIC_BASE_URL=http://127.0.0.1:${window.location.port || '8082'}`}
          </code>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </div>
        <div className="page-wrapper fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
