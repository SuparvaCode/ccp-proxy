import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plug, Cpu, GitBranch, FlaskConical, ScrollText, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { label: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ]},
  { label: 'Configuration', items: [
    { to: '/providers', icon: Plug, label: 'Providers' },
    { to: '/models', icon: Cpu, label: 'Models' },
    { to: '/routing', icon: GitBranch, label: 'Model Routing' },
  ]},
  { label: 'Tools', items: [
    { to: '/playground', icon: FlaskConical, label: 'Playground' },
    { to: '/logs', icon: ScrollText, label: 'Request Logs' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]},
];

export default function Sidebar({ serverOnline }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div>
          <div className="sidebar-logo-text">CCP Proxy</div>
          <div className="sidebar-logo-sub">Claude Code Proxy</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon className="nav-icon" size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="server-status">
          <div className={`status-dot${serverOnline ? '' : ' offline'}`} />
          <span>{serverOnline ? 'Server Online' : 'Server Offline'}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{`:${window.location.port || '8082'}`}</span>
      </div>
    </aside>
  );
}
