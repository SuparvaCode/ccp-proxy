import { OpenAICompatProvider } from './openaicompat.js';

export class CerebrasProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.cerebras.ai/v1' });
  }
  chatEndpoint() { return `${this.baseUrl}/chat/completions`; }
  modelsEndpoint() { return `${this.baseUrl}/models`; }
}
