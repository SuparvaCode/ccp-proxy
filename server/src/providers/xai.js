import { OpenAICompatProvider } from './openaicompat.js';

export class XAIProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.x.ai' });
  }
}
