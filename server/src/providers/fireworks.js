import { OpenAICompatProvider } from './openaicompat.js';

export class FireworksProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.fireworks.ai/inference' });
  }
}
