import { BaseProvider } from './base.js';
import { toOpenAI } from '../translators/toProvider.js';
import { fromOpenAI } from '../translators/fromProvider.js';
import { streamOpenAIToAnthropic } from '../translators/streaming.js';

/**
 * Generic OpenAI-compatible provider base.
 * DeepSeek, Groq, Mistral, Cerebras, Fireworks, NVIDIA, Together, xAI, LM Studio, llama.cpp all use this.
 */
export class OpenAICompatProvider extends BaseProvider {
  constructor(config) { super(config); }

  modelsEndpoint() { return `${this.baseUrl}/v1/models`; }
  chatEndpoint() { return `${this.baseUrl}/v1/chat/completions`; }

  async listModels() {
    try {
      const data = await this.fetchJson(this.modelsEndpoint(), {
        headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      });
      return (data.data || data.models || []).map(m => {
        let id = m.id || m.name || '';
        // Some providers (Groq) return model IDs with their own prefix e.g. "groq/compound"
        // Strip it to avoid double-prefix in the "provider/model" proxy format
        const providerPrefixes = [this.id + '/'];
        for (const prefix of providerPrefixes) {
          if (id.startsWith(prefix)) { id = id.slice(prefix.length); break; }
        }
        return {
          id,
          name: m.name || m.id,
          description: m.description || '',
          context_length: m.context_length || m.max_tokens || null,
          capabilities: ['chat'],
        };
      });
    } catch (e) {
      console.warn(`[${this.id}] listModels failed:`, e.message);
      return [];
    }
  }

  async complete(anthropicBody) {
    const model = anthropicBody._resolvedModel;
    const body = toOpenAI(anthropicBody, model);
    const data = await this.fetchJson(this.chatEndpoint(), {
      method: 'POST',
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return fromOpenAI(data, model, anthropicBody._requestId);
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    const model = anthropicBody._resolvedModel;
    const body = { ...toOpenAI(anthropicBody, model), stream: true, stream_options: { include_usage: true } };
    const stream = await this.fetchStream(this.chatEndpoint(), {
      method: 'POST',
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await streamOpenAIToAnthropic(res, stream, model, requestId, onComplete);
  }
}
