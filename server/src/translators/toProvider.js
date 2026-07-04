/**
 * Translates an Anthropic Messages request body to the target provider's format.
 * Most cloud providers use OpenAI-compatible Chat Completions format.
 */

export function toOpenAI(anthropicBody, targetModel) {
  const { messages, system, max_tokens, temperature, top_p, stop_sequences, tools, tool_choice, stream } = anthropicBody;

  const oaiMessages = [];

  // System prompt
  if (system) {
    const sysText = Array.isArray(system)
      ? system.map(b => (typeof b === 'string' ? b : b.text || '')).join('\n')
      : system;
    oaiMessages.push({ role: 'system', content: sysText });
  }

  // Convert messages
  for (const msg of (messages || [])) {
    oaiMessages.push(convertMessage(msg));
  }

  const body = {
    model: targetModel,
    messages: oaiMessages,
    stream: stream || false,
  };

  if (max_tokens) body.max_tokens = max_tokens;
  if (temperature !== undefined) body.temperature = temperature;
  if (top_p !== undefined) body.top_p = top_p;
  if (stop_sequences && stop_sequences.length) body.stop = stop_sequences;

  // Tools
  if (tools && tools.length) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description || '',
        parameters: t.input_schema || { type: 'object', properties: {} },
      },
    }));
  }

  if (tool_choice) {
    if (tool_choice.type === 'auto') body.tool_choice = 'auto';
    else if (tool_choice.type === 'any') body.tool_choice = 'required';
    else if (tool_choice.type === 'tool') body.tool_choice = { type: 'function', function: { name: tool_choice.name } };
  }

  return body;
}

/**
 * Google AI Studio (Gemini) uses a different format entirely.
 */
export function toGemini(anthropicBody, targetModel) {
  const { messages, system, max_tokens, temperature, top_p, stop_sequences, tools } = anthropicBody;

  const contents = [];

  for (const msg of (messages || [])) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = contentToParts(msg.content);
    contents.push({ role, parts });
  }

  const body = {
    contents,
    generationConfig: {},
  };

  if (system) {
    const sysText = Array.isArray(system)
      ? system.map(b => (typeof b === 'string' ? b : b.text || '')).join('\n')
      : system;
    body.system_instruction = { parts: [{ text: sysText }] };
  }

  if (max_tokens) body.generationConfig.maxOutputTokens = max_tokens;
  if (temperature !== undefined) body.generationConfig.temperature = temperature;
  if (top_p !== undefined) body.generationConfig.topP = top_p;
  if (stop_sequences && stop_sequences.length) body.generationConfig.stopSequences = stop_sequences;

  if (tools && tools.length) {
    body.tools = [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description || '',
        parameters: t.input_schema || { type: 'object', properties: {} },
      })),
    }];
  }

  return body;
}

/**
 * Cohere uses a different chat format.
 */
export function toCohere(anthropicBody, targetModel) {
  const { messages, system, max_tokens, temperature } = anthropicBody;

  const chatHistory = [];
  let userMessage = '';

  for (let i = 0; i < (messages || []).length; i++) {
    const msg = messages[i];
    const text = extractText(msg.content);
    if (i === messages.length - 1 && msg.role === 'user') {
      userMessage = text;
    } else {
      chatHistory.push({ role: msg.role === 'assistant' ? 'CHATBOT' : 'USER', message: text });
    }
  }

  const body = {
    model: targetModel,
    message: userMessage,
    chat_history: chatHistory,
    stream: anthropicBody.stream || false,
  };

  if (system) body.preamble = typeof system === 'string' ? system : extractText(system);
  if (max_tokens) body.max_tokens = max_tokens;
  if (temperature !== undefined) body.temperature = temperature;

  return body;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function convertMessage(msg) {
  const { role, content } = msg;
  if (typeof content === 'string') return { role, content };

  if (!Array.isArray(content)) return { role, content: String(content) };

  // Multi-part content
  const textParts = [];
  const toolResults = [];

  for (const block of content) {
    if (block.type === 'text') {
      textParts.push({ type: 'text', text: block.text });
    } else if (block.type === 'tool_use') {
      // Assistant tool call
      textParts.push({
        type: 'tool_call',
        // Will be handled as function call in the OpenAI format below
        _tool_use: block,
      });
    } else if (block.type === 'tool_result') {
      toolResults.push(block);
    } else if (block.type === 'image') {
      if (block.source?.type === 'base64') {
        textParts.push({
          type: 'image_url',
          image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
        });
      }
    }
  }

  // If there are tool_use blocks, convert to OAI tool_calls format
  const toolUseBlocks = content.filter(b => b.type === 'tool_use');
  if (role === 'assistant' && toolUseBlocks.length > 0) {
    const textContent = content.filter(b => b.type === 'text').map(b => b.text).join('');
    return {
      role: 'assistant',
      content: textContent || null,
      tool_calls: toolUseBlocks.map(b => ({
        id: b.id,
        type: 'function',
        function: { name: b.name, arguments: JSON.stringify(b.input || {}) },
      })),
    };
  }

  // Tool result messages
  if (role === 'user' && content.some(b => b.type === 'tool_result')) {
    return content.filter(b => b.type === 'tool_result').map(b => ({
      role: 'tool',
      tool_call_id: b.tool_use_id,
      content: extractText(b.content),
    }));
  }

  // Regular user message with mixed content
  const parts = content.map(b => {
    if (b.type === 'text') return { type: 'text', text: b.text };
    if (b.type === 'image' && b.source?.type === 'base64') {
      return { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
    }
    return null;
  }).filter(Boolean);

  return { role, content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts };
}

function contentToParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content) }];
  return content.map(b => {
    if (b.type === 'text') return { text: b.text };
    if (b.type === 'image' && b.source?.type === 'base64') {
      return { inlineData: { mimeType: b.source.media_type, data: b.source.data } };
    }
    if (b.type === 'tool_use') return { functionCall: { name: b.name, args: b.input || {} } };
    if (b.type === 'tool_result') return { functionResponse: { name: b.tool_use_id, response: { content: extractText(b.content) } } };
    return { text: '' };
  });
}

export function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter(b => b.type === 'text').map(b => b.text).join('');
  return String(content || '');
}
