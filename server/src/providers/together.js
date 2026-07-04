import { OpenAICompatProvider } from './openaicompat.js';

export class TogetherProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.together.xyz' });
  }
}
