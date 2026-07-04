import crypto from 'crypto';

/**
 * Pipes an SSE stream from an OpenAI-compatible provider and re-emits
 * it as Anthropic SSE events.
 *
 * Anthropic SSE event sequence:
 *   message_start → content_block_start → content_block_delta* → content_block_stop → message_delta → message_stop
 */
export async function streamOpenAIToAnthropic(res, nodeStream, model, requestId, onComplete) {
  const msgId = requestId || `msg_${crypto.randomUUID().slice(0, 24)}`;

  let inputTokens = 0;
  let outputTokens = 0;
  let blockIndex = 0;
  let thinkingBlockStarted = false;
  let textBlockStarted = false;
  let toolBlocks = {}; // id → index

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // message_start
  send('message_start', {
    type: 'message_start',
    message: {
      id: msgId, type: 'message', role: 'assistant', model,
      content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  });

  send('ping', { type: 'ping' });

  let buffer = '';

  try {
    for await (const chunk of nodeStream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        let delta;
        try { delta = JSON.parse(raw); } catch { continue; }

        const choice = delta.choices?.[0];
        if (!choice) continue;

        const d = choice.delta || {};

        // Usage info
        if (delta.usage) {
          inputTokens = delta.usage.prompt_tokens || inputTokens;
          outputTokens = delta.usage.completion_tokens || outputTokens;
        }

        // Reasoning content (DeepSeek R1, etc.)
        if (d.reasoning_content) {
          if (!thinkingBlockStarted) {
            send('content_block_start', {
              type: 'content_block_start',
              index: blockIndex,
              content_block: { type: 'thinking', thinking: '' },
            });
            thinkingBlockStarted = true;
          }
          send('content_block_delta', {
            type: 'content_block_delta',
            index: blockIndex,
            delta: { type: 'thinking_delta', thinking: d.reasoning_content },
          });
        }

        // Text content
        if (d.content) {
          if (thinkingBlockStarted && !textBlockStarted) {
            send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
            blockIndex++;
            thinkingBlockStarted = false;
          }
          if (!textBlockStarted) {
            send('content_block_start', {
              type: 'content_block_start',
              index: blockIndex,
              content_block: { type: 'text', text: '' },
            });
            textBlockStarted = true;
          }
          send('content_block_delta', {
            type: 'content_block_delta',
            index: blockIndex,
            delta: { type: 'text_delta', text: d.content },
          });
          outputTokens++; // rough estimate if not provided
        }

        // Tool calls
        if (d.tool_calls) {
          for (const tc of d.tool_calls) {
            const tcIdx = tc.index ?? 0;
            const toolKey = `tool_${tcIdx}`;

            if (!toolBlocks[toolKey]) {
              if (textBlockStarted) {
                send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
                blockIndex++;
                textBlockStarted = false;
              }
              const toolId = tc.id || `toolu_${crypto.randomUUID().slice(0, 8)}`;
              toolBlocks[toolKey] = { index: blockIndex, id: toolId, name: tc.function?.name || '' };
              send('content_block_start', {
                type: 'content_block_start',
                index: blockIndex,
                content_block: { type: 'tool_use', id: toolId, name: tc.function?.name || '', input: {} },
              });
              blockIndex++;
            }

            if (tc.function?.arguments) {
              send('content_block_delta', {
                type: 'content_block_delta',
                index: toolBlocks[toolKey].index,
                delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
              });
            }
          }
        }

        // Finish
        if (choice.finish_reason) {
          if (thinkingBlockStarted) {
            send('content_block_stop', { type: 'content_block_stop', index: blockIndex - (textBlockStarted ? 0 : 0) });
          }
          if (textBlockStarted) {
            send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
          }
          for (const tb of Object.values(toolBlocks)) {
            send('content_block_stop', { type: 'content_block_stop', index: tb.index });
          }

          const stopReason = mapFinishReason(choice.finish_reason);
          send('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: stopReason, stop_sequence: null },
            usage: { output_tokens: outputTokens },
          });
          send('message_stop', { type: 'message_stop' });
        }
      }
    }
  } catch (err) {
    console.error('[Stream]', err.message);
  } finally {
    res.end();
    onComplete?.({ inputTokens, outputTokens });
  }
}

/**
 * Pipes a Gemini SSE stream → Anthropic SSE events.
 */
export async function streamGeminiToAnthropic(res, nodeStream, model, requestId, onComplete) {
  const msgId = requestId || `msg_${crypto.randomUUID().slice(0, 24)}`;
  let outputTokens = 0;
  let inputTokens = 0;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  send('message_start', {
    type: 'message_start',
    message: { id: msgId, type: 'message', role: 'assistant', model, content: [], stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } },
  });
  send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });

  let buffer = '';
  try {
    for await (const chunk of nodeStream) {
      buffer += chunk.toString();
      // Gemini streams JSON objects separated by newlines
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.replace(/^data:\s*/, '').trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        let obj;
        try { obj = JSON.parse(trimmed); } catch { continue; }

        const parts = obj.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: part.text } });
            outputTokens++;
          }
        }

        if (obj.usageMetadata) {
          inputTokens = obj.usageMetadata.promptTokenCount || 0;
          outputTokens = obj.usageMetadata.candidatesTokenCount || outputTokens;
        }

        if (obj.candidates?.[0]?.finishReason) {
          send('content_block_stop', { type: 'content_block_stop', index: 0 });
          send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: outputTokens } });
          send('message_stop', { type: 'message_stop' });
        }
      }
    }
  } catch (err) {
    console.error('[GeminiStream]', err.message);
  } finally {
    res.end();
    onComplete?.({ inputTokens, outputTokens });
  }
}

function mapFinishReason(r) {
  if (r === 'stop') return 'end_turn';
  if (r === 'length') return 'max_tokens';
  if (r === 'tool_calls') return 'tool_use';
  return 'end_turn';
}

export async function streamBedrockToAnthropic(res, bedrockStream, model, requestId, onComplete) {
  const msgId = requestId || `msg_${crypto.randomUUID().slice(0, 24)}`;
  let inputTokens = 0;
  let outputTokens = 0;
  let blockIndex = 0;
  let textBlockStarted = false;
  let toolBlocks = {}; // index -> toolId

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // message_start
  send('message_start', {
    type: 'message_start',
    message: {
      id: msgId, type: 'message', role: 'assistant', model,
      content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  });

  send('ping', { type: 'ping' });

  try {
    for await (const chunk of bedrockStream) {
      // 1. contentBlockStart
      if (chunk.contentBlockStart) {
        const idx = chunk.contentBlockStart.contentBlockIndex ?? 0;
        const start = chunk.contentBlockStart.start || {};
        if (start.toolUse) {
          if (textBlockStarted) {
            send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
            blockIndex++;
            textBlockStarted = false;
          }
          const tUse = start.toolUse;
          toolBlocks[idx] = { index: blockIndex, id: tUse.toolUseId, name: tUse.name };
          send('content_block_start', {
            type: 'content_block_start',
            index: blockIndex,
            content_block: { type: 'tool_use', id: tUse.toolUseId, name: tUse.name, input: {} },
          });
          blockIndex++;
        }
      }

      // 2. contentBlockDelta
      if (chunk.contentBlockDelta) {
        const idx = chunk.contentBlockDelta.contentBlockIndex ?? 0;
        const delta = chunk.contentBlockDelta.delta || {};
        if (delta.text) {
          if (!textBlockStarted) {
            send('content_block_start', {
              type: 'content_block_start',
              index: blockIndex,
              content_block: { type: 'text', text: '' },
            });
            textBlockStarted = true;
          }
          send('content_block_delta', {
            type: 'content_block_delta',
            index: blockIndex,
            delta: { type: 'text_delta', text: delta.text },
          });
          outputTokens++;
        } else if (delta.toolUse) {
          const tBlock = toolBlocks[idx];
          if (tBlock && delta.toolUse.input) {
            send('content_block_delta', {
              type: 'content_block_delta',
              index: tBlock.index,
              delta: { type: 'input_json_delta', partial_json: delta.toolUse.input },
            });
          }
        }
      }

      // 3. contentBlockStop
      if (chunk.contentBlockStop) {
        const idx = chunk.contentBlockStop.contentBlockIndex ?? 0;
        const tBlock = toolBlocks[idx];
        if (tBlock) {
          send('content_block_stop', { type: 'content_block_stop', index: tBlock.index });
        }
      }

      // 4. messageStop
      if (chunk.messageStop) {
        if (textBlockStarted) {
          send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
        }
        let stopReason = 'end_turn';
        if (chunk.messageStop.stopReason === 'tool_use') stopReason = 'tool_use';
        else if (chunk.messageStop.stopReason === 'max_tokens') stopReason = 'max_tokens';
        else if (chunk.messageStop.stopReason === 'stop_sequence') stopReason = 'stop_sequence';

        send('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: { output_tokens: outputTokens },
        });
        send('message_stop', { type: 'message_stop' });
      }

      // 5. metadata (token usage)
      if (chunk.metadata) {
        if (chunk.metadata.usage) {
          inputTokens = chunk.metadata.usage.inputTokens || inputTokens;
          outputTokens = chunk.metadata.usage.outputTokens || outputTokens;
        }
      }
    }
  } catch (err) {
    console.error('[Bedrock Stream]', err.message);
  } finally {
    res.end();
    onComplete?.({ inputTokens, outputTokens });
  }
}
