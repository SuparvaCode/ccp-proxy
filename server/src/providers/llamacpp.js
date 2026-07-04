import { OpenAICompatProvider } from './openaicompat.js';

export class LlamaCppProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'http://localhost:8080' });
  }
  authHeader() { return {}; }
  async listModels() {
    // llama.cpp exposes only one model at a time
    return [{ id: 'local-model', name: 'Local llama.cpp Model', description: '', context_length: null, capabilities: ['chat'] }];
  }
}
