/**
 * Rough estimation of tokens from string content (approx. 4 characters per token).
 */
export function estimateTextTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimates input tokens for an Anthropic-compatible request body.
 */
export function estimateInputTokens(body) {
  if (!body) return 0;
  let charCount = 0;

  // System prompt
  if (body.system) {
    charCount += typeof body.system === 'string'
      ? body.system.length
      : JSON.stringify(body.system).length;
  }

  // Messages
  const messages = body.messages || [];
  for (const m of messages) {
    const c = m.content;
    if (typeof c === 'string') {
      charCount += c.length;
    } else if (Array.isArray(c)) {
      for (const block of c) {
        if (block.type === 'text' && block.text) {
          charCount += block.text.length;
        } else if (block.type === 'image' && block.source) {
          // Add a flat budget for image tokens
          charCount += 1000; 
        }
      }
    }
  }

  // Tools schemas
  if (body.tools && body.tools.length) {
    charCount += JSON.stringify(body.tools).length;
  }

  return Math.max(1, Math.ceil(charCount / 4));
}
