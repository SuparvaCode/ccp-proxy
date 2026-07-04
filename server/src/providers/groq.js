import { OpenAICompatProvider } from './openaicompat.js';

export class GroqProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.groq.com/openai' });
  }
}
