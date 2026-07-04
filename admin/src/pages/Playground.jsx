import { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Trash2, FlaskConical, ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProviders } from '../lib/hooks.js';

export default function Playground({ toast }) {
  const { data: providers } = useProviders();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [system, setSystem] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ inputTokens: 0, outputTokens: 0, latency: 0, rpm: 0, tpm: 0 });
  const abortRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (selectedProvider) {
      api.getModels(selectedProvider).then(setModels).catch(() => setModels([]));
    }
  }, [selectedProvider]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedProvider || !selectedModel) {
      toast.error('Select a provider, model, and enter a message');
      return;
    }

    const userMsg = { role: 'user', content: input.trim() };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);
    const start = Date.now();

    const body = {
      provider_id: selectedProvider,
      model_id: selectedModel,
      messages: currentMessages,
      system: system || undefined,
      temperature,
      max_tokens: maxTokens,
      stream: streaming,
    };

    if (streaming) {
      let assistantText = '';
      let thinkingText = '';
      const assistantIdx = currentMessages.length;
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      abortRef.current = false;
      await api.playgroundStream(
        body,
        (evt) => {
          if (abortRef.current) return;
          if (evt.type === 'content_block_delta') {
            if (evt.delta?.type === 'text_delta') {
              assistantText += evt.delta.text;
              setMessages(m => {
                const copy = [...m];
                copy[assistantIdx] = { role: 'assistant', content: assistantText };
                return copy;
              });
            } else if (evt.delta?.type === 'thinking_delta') {
              thinkingText += evt.delta.thinking;
            }
          }
          if (evt.type === 'message_delta' && evt.usage) {
            const latency = Date.now() - start;
            setMetrics(prev => ({
              inputTokens: prev.inputTokens,
              outputTokens: evt.usage.output_tokens || 0,
              latency,
              rpm: prev.rpm + 1,
              tpm: prev.tpm + (evt.usage.output_tokens || 0),
            }));
          }
        },
        () => setLoading(false),
        (e) => { toast.error(e.message); setLoading(false); }
      );
    } else {
      try {
        const result = await api.playground(body);
        const text = result.content?.map(c => c.text || '').join('') || '';
        setMessages(m => [...m, { role: 'assistant', content: text }]);
        setMetrics(m => ({
          inputTokens: result.usage?.input_tokens || 0,
          outputTokens: result.usage?.output_tokens || 0,
          latency: Date.now() - start,
          rpm: m.rpm + 1,
          tpm: m.tpm + (result.usage?.output_tokens || 0),
        }));
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearChat = () => { setMessages([]); setMetrics({ inputTokens: 0, outputTokens: 0, latency: 0, rpm: 0, tpm: 0 }); };

  const enabledProviders = providers?.filter(p => p.enabled) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Playground</h1>
          <p className="page-subtitle">Test models with streaming, view token metrics and latency in real-time</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearChat} disabled={loading}>
          <Trash2 size={13} /> Clear Chat
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, height: 'calc(100vh - 200px)', minHeight: 600 }}>
        {/* Chat area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat messages */}
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {messages.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 80 }}>
                <FlaskConical className="empty-state-icon" />
                <div className="empty-state-title">Start a conversation</div>
                <div className="empty-state-desc">Select a provider and model, then send a message to test it.</div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <div className={`message-avatar ${msg.role}`}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`message-bubble ${msg.role}`}>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{msg.content}</div>
                    {loading && i === messages.length - 1 && msg.role === 'assistant' && (
                      <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--brand-light)', borderRadius: 2, animation: 'pulse 0.8s infinite', marginLeft: 2 }} />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Metrics bar */}
          <div className="metrics-bar">
            <div className="metric-item">⬆️ <span className="metric-value">{metrics.inputTokens}</span> in</div>
            <div className="metric-item">⬇️ <span className="metric-value">{metrics.outputTokens}</span> out</div>
            <div className="metric-item">⏱️ <span className="metric-value">{metrics.latency}ms</span></div>
            <div className="metric-item">🔄 <span className="metric-value">{metrics.tpm}</span> tok</div>
          </div>

          {/* Input area */}
          <div className="chat-input-area">
            <textarea
              className="input"
              style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120 }}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            {loading ? (
              <button className="btn btn-danger" onClick={() => { abortRef.current = true; setLoading(false); }}>
                <StopCircle size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSend} disabled={!selectedProvider || !selectedModel}>
                <Send size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header" style={{ padding: '14px 16px 12px' }}>
              <div className="card-title" style={{ fontSize: 13 }}>Model Selection</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label className="input-label">Provider</label>
                <select className="input select" value={selectedProvider} onChange={e => { setSelectedProvider(e.target.value); setSelectedModel(''); }}>
                  <option value="">Select…</option>
                  {enabledProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Model</label>
                {models.length > 0 ? (
                  <select className="input select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                    <option value="">Select model…</option>
                    {models.map(m => <option key={m.model_id} value={m.model_id}>{m.model_name || m.model_id}</option>)}
                  </select>
                ) : (
                  <input className="input input-mono" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} placeholder="e.g. gemini-1.5-flash" />
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ padding: '14px 16px 12px' }}>
              <div className="card-title" style={{ fontSize: 13 }}>Parameters</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label className="input-label">System Prompt</label>
                <textarea className="input" style={{ minHeight: 70 }} value={system} onChange={e => setSystem(e.target.value)} placeholder="Optional system prompt…" rows={3} />
              </div>
              <div className="input-group">
                <label className="input-label">Temperature: {temperature}</label>
                <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Max Tokens</label>
                <input className="input" type="number" min={1} max={128000} value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value) || 2048)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={streaming} onChange={e => setStreaming(e.target.checked)} />
                  <span className="toggle-track" />
                </label>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Streaming</span>
              </div>
            </div>
          </div>

          {selectedProvider && selectedModel && (
            <div className="card">
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Proxy format</div>
                <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--brand-light)', wordBreak: 'break-all' }}>
                  {selectedProvider}/{selectedModel}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
