import { BaseProvider } from './base.js';
import { toGemini } from '../translators/toProvider.js';
import { fromGemini } from '../translators/fromProvider.js';
import { streamGeminiToAnthropic } from '../translators/streaming.js';

export class GoogleProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.base_url || 'https://generativelanguage.googleapis.com';
  }

  async listModels() {
    const data = await this.fetchJson(
      `${this.baseUrl}/v1beta/models?key=${this.apiKey}&pageSize=100`
    );
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name,
        description: m.description || '',
        context_length: m.inputTokenLimit || null,
        capabilities: ['chat', 'vision', 'tools'],
      }));
  }

  async complete(anthropicBody) {
    const model = anthropicBody._resolvedModel || 'gemini-1.5-flash';
    const body = toGemini(anthropicBody, model);
    const data = await this.fetchJson(
      `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    return fromGemini(data, model, anthropicBody._requestId);
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    const model = anthropicBody._resolvedModel || 'gemini-1.5-flash';
    const body = toGemini(anthropicBody, model);
    const stream = await this.fetchStream(
      `${this.baseUrl}/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    await streamGeminiToAnthropic(res, stream, model, requestId, onComplete);
  }
}
