import crypto from 'crypto';

/**
 * Converts a non-streaming OpenAI Chat Completions response → Anthropic Messages response.
 */
export function fromOpenAI(oaiResponse, model, requestId) {
  const choice = oaiResponse.choices?.[0];
  if (!choice) throw new Error('No choices in provider response');

  const usage = oaiResponse.usage || {};
  const content = [];

  // Thinking/reasoning tokens (e.g. DeepSeek R1 reasoning_content)
  if (choice.message?.reasoning_content) {
    content.push({ type: 'thinking', thinking: choice.message.reasoning_content });
  }

  // Text content
  if (choice.message?.content) {
    content.push({ type: 'text', text: choice.message.content });
  }

  // Tool calls
  if (choice.message?.tool_calls?.length) {
    for (const tc of choice.message.tool_calls) {
      let input = {};
      try { input = JSON.parse(tc.function.arguments || '{}'); } catch {}
      content.push({
        type: 'tool_use',
        id: tc.id || `toolu_${crypto.randomUUID().slice(0, 8)}`,
        name: tc.function.name,
        input,
      });
    }
  }

  const stopReason = mapStopReason(choice.finish_reason);

  return {
    id: requestId || `msg_${crypto.randomUUID().slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
    },
  };
}

/**
 * Converts a non-streaming Gemini response → Anthropic Messages response.
 */
export function fromGemini(geminiResponse, model, requestId) {
  const candidate = geminiResponse.candidates?.[0];
  const content = [];

  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) content.push({ type: 'text', text: part.text });
      if (part.functionCall) {
        content.push({
          type: 'tool_use',
          id: `toolu_${crypto.randomUUID().slice(0, 8)}`,
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        });
      }
    }
  }

  const usage = geminiResponse.usageMetadata || {};

  return {
    id: requestId || `msg_${crypto.randomUUID().slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: mapGeminiStopReason(candidate?.finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0,
    },
  };
}

/**
 * Converts a non-streaming Cohere response → Anthropic Messages response.
 */
export function fromCohere(cohereResponse, model, requestId) {
  const text = cohereResponse.text || '';
  const tokens = cohereResponse.meta?.tokens || {};

  return {
    id: requestId || `msg_${crypto.randomUUID().slice(0, 24)}`,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: tokens.input_tokens || 0,
      output_tokens: tokens.output_tokens || 0,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStopReason(finishReason) {
  switch (finishReason) {
    case 'stop': return 'end_turn';
    case 'length': return 'max_tokens';
    case 'tool_calls': return 'tool_use';
    case 'content_filter': return 'stop_sequence';
    default: return 'end_turn';
  }
}

function mapGeminiStopReason(reason) {
  switch (reason) {
    case 'STOP': return 'end_turn';
    case 'MAX_TOKENS': return 'max_tokens';
    case 'SAFETY': return 'stop_sequence';
    case 'RECITATION': return 'stop_sequence';
    default: return 'end_turn';
  }
}
