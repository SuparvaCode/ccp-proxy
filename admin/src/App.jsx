import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Providers from './pages/Providers.jsx';
import Models from './pages/Models.jsx';
import ModelRouting from './pages/ModelRouting.jsx';
import Playground from './pages/Playground.jsx';
import Logs from './pages/Logs.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import { useTheme, useToast } from './lib/hooks.js';
import ToastContainer from './components/ToastContainer.jsx';

export default function App() {
  const { theme, toggle } = useTheme();
  const { toasts, toast, removeToast } = useToast();

  return (
    <BrowserRouter>
      <Layout theme={theme} toggleTheme={toggle} toast={toast}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard toast={toast} />} />
          <Route path="/providers" element={<Providers toast={toast} />} />
          <Route path="/models" element={<Models toast={toast} />} />
          <Route path="/routing" element={<ModelRouting toast={toast} />} />
          <Route path="/playground" element={<Playground toast={toast} />} />
          <Route path="/logs" element={<Logs toast={toast} />} />
          <Route path="/analytics" element={<Analytics toast={toast} />} />
          <Route path="/settings" element={<Settings toast={toast} />} />
        </Routes>
      </Layout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </BrowserRouter>
  );
}
