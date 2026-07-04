import { OpenAICompatProvider } from './openaicompat.js';

export class LMStudioProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'http://localhost:1234' });
  }
  authHeader() { return {}; }
}
