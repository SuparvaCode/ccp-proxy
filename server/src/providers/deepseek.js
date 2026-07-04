import { OpenAICompatProvider } from './openaicompat.js';

export class DeepSeekProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.deepseek.com' });
  }
  chatEndpoint() { return `${this.baseUrl}/v1/chat/completions`; }
  modelsEndpoint() { return `${this.baseUrl}/v1/models`; }
}
