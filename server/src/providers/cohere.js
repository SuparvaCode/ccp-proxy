import { BaseProvider } from './base.js';
import { toOpenAI, extractText } from '../translators/toProvider.js';
import { streamOpenAIToAnthropic } from '../translators/streaming.js';
import crypto from 'crypto';

export class CohereProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.cohere.ai' });
  }

  async listModels() {
    const data = await this.fetchJson(`${this.baseUrl}/v1/models`, {
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
    });
    return (data.models || []).map(m => ({
      id: m.name,
      name: m.name,
      description: m.endpoints?.join(', ') || '',
      context_length: m.context_length || null,
      capabilities: ['chat'],
    }));
  }

  async complete(anthropicBody) {
    const model = anthropicBody._resolvedModel || 'command-r-plus';
    const { messages, system, max_tokens, temperature } = anthropicBody;

    const chatHistory = [];
    let userMessage = '';
    for (let i = 0; i < (messages || []).length; i++) {
      const msg = messages[i];
      const text = extractText(msg.content);
      if (i === messages.length - 1 && msg.role === 'user') {
        userMessage = text;
      } else {
        chatHistory.push({ role: msg.role === 'assistant' ? 'CHATBOT' : 'USER', message: text });
      }
    }

    const body = { model, message: userMessage, chat_history: chatHistory };
    if (system) body.preamble = typeof system === 'string' ? system : extractText(system);
    if (max_tokens) body.max_tokens = max_tokens;
    if (temperature !== undefined) body.temperature = temperature;

    const data = await this.fetchJson(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return {
      id: anthropicBody._requestId || `msg_${crypto.randomUUID().slice(0, 24)}`,
      type: 'message', role: 'assistant', model,
      content: [{ type: 'text', text: data.text || '' }],
      stop_reason: 'end_turn', stop_sequence: null,
      usage: {
        input_tokens: data.meta?.tokens?.input_tokens || 0,
        output_tokens: data.meta?.tokens?.output_tokens || 0,
      },
    };
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    // Cohere doesn't have OpenAI-compat streaming, use basic SSE
    const result = await this.complete(anthropicBody);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    function send(event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
    send('message_start', { type: 'message_start', message: { ...result, content: [] } });
    send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
    const text = result.content[0]?.text || '';
    // Chunk it for realistic streaming
    const chunkSize = 20;
    for (let i = 0; i < text.length; i += chunkSize) {
      send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(i, i + chunkSize) } });
    }
    send('content_block_stop', { type: 'content_block_stop', index: 0 });
    send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: result.usage });
    send('message_stop', { type: 'message_stop' });
    res.end();
    onComplete?.(result.usage);
  }
}
