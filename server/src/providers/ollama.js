import { OpenAICompatProvider } from './openaicompat.js';

export class OllamaProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'http://localhost:11434' });
  }

  chatEndpoint() { return `${this.baseUrl}/v1/chat/completions`; }
  modelsEndpoint() { return `${this.baseUrl}/api/tags`; }

  authHeader() { return {}; } // No auth for local

  async listModels() {
    try {
      const data = await this.fetchJson(this.modelsEndpoint());
      return (data.models || []).map(m => ({
        id: m.name,
        name: m.name,
        description: `Size: ${m.size ? (m.size / 1e9).toFixed(1) + 'GB' : 'unknown'}`,
        context_length: null,
        capabilities: ['chat'],
      }));
    } catch (e) {
      console.warn('[ollama] listModels failed (is Ollama running?):', e.message);
      return [];
    }
  }
}
