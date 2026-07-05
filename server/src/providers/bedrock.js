// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { BaseProvider } from './base.js';
import { OpenAICompatProvider } from './openaicompat.js';
import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { streamBedrockToAnthropic } from '../translators/streaming.js';
import crypto from 'crypto';

export class BedrockProvider extends BaseProvider {
  constructor(config) {
    super(config);
    // Determine if we should use OpenAI compatibility layer or native AWS SDK
    this.useOpenAICompat = !!this.extraConfig.use_openai_compat;
    if (this.useOpenAICompat) {
      this.openAICompat = new OpenAICompatProvider(config);
    } else {
      const clientConfig = {
        region: this.extraConfig.aws_region || 'us-east-1',
      };
      const secretKey = this.apiKey || this.extraConfig.aws_secret_access_key;
      if (this.extraConfig.aws_access_key_id && secretKey) {
        clientConfig.credentials = {
          accessKeyId: this.extraConfig.aws_access_key_id,
          secretAccessKey: secretKey,
          sessionToken: this.extraConfig.aws_session_token || undefined,
        };
      }
      this.client = new BedrockRuntimeClient(clientConfig);
    }
  }

  async listModels() {
    if (this.useOpenAICompat) {
      return this.openAICompat.listModels();
    }

    try {
      const { BedrockClient, ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock');
      
      const clientConfig = {
        region: this.extraConfig.aws_region || 'us-east-1',
      };
      const secretKey = this.apiKey || this.extraConfig.aws_secret_access_key;
      if (this.extraConfig.aws_access_key_id && secretKey) {
        clientConfig.credentials = {
          accessKeyId: this.extraConfig.aws_access_key_id,
          secretAccessKey: secretKey,
          sessionToken: this.extraConfig.aws_session_token || undefined,
        };
      }
      
      const adminClient = new BedrockClient(clientConfig);
      const command = new ListFoundationModelsCommand({ byOutputModality: 'TEXT' });
      const response = await adminClient.send(command);
      
      if (response.modelSummaries && response.modelSummaries.length > 0) {
        return response.modelSummaries.map(m => {
          // Standard context lengths for Bedrock families
          let contextLength = 200000;
          if (m.modelId.includes('claude-3-7')) contextLength = 200000;
          else if (m.modelId.includes('claude-3-5')) contextLength = 200000;
          else if (m.modelId.includes('llama3')) contextLength = 128000;
          else if (m.modelId.includes('nova')) contextLength = 300000;
          else if (m.modelId.includes('command-r')) contextLength = 128000;
          
          return {
            id: m.modelId,
            name: `${m.providerName} - ${m.modelName}`,
            context_length: contextLength,
            capabilities: ['chat'],
            description: `Status: ${m.modelLifecycle?.status || 'ACTIVE'} | Customizations: ${JSON.stringify(m.customizationsSupported || [])}`,
          };
        });
      }
    } catch (e) {
      console.warn('[CCP][Bedrock] Live listModels failed, falling back to static list:', e.message);
    }

    // Static list of popular Bedrock models as a fallback
    return [
      // Claude 3.7
      { id: 'anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },

      // Claude 3.5
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2 (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },
      { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet v1', context_length: 200000, capabilities: ['chat'] },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },

      // Claude 3
      { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },
      { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', context_length: 200000, capabilities: ['chat'] },
      { id: 'us.anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (US Cross-Region)', context_length: 200000, capabilities: ['chat'] },

      // Llama 3.3
      { id: 'meta.llama3-3-70b-instruct-v1:0', name: 'Llama 3.3 70B Instruct', context_length: 128000, capabilities: ['chat'] },
      { id: 'us.meta.llama3-3-70b-instruct-v1:0', name: 'Llama 3.3 70B Instruct (US Cross-Region)', context_length: 128000, capabilities: ['chat'] },

      // Llama 3.1
      { id: 'meta.llama3-1-405b-instruct-v1:0', name: 'Llama 3.1 405B Instruct', context_length: 128000, capabilities: ['chat'] },
      { id: 'us.meta.llama3-1-405b-instruct-v1:0', name: 'Llama 3.1 405B Instruct (US Cross-Region)', context_length: 128000, capabilities: ['chat'] },
      { id: 'meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B Instruct', context_length: 128000, capabilities: ['chat'] },
      { id: 'us.meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B Instruct (US Cross-Region)', context_length: 128000, capabilities: ['chat'] },
      { id: 'meta.llama3-1-8b-instruct-v1:0', name: 'Llama 3.1 8B Instruct', context_length: 128000, capabilities: ['chat'] },
      { id: 'us.meta.llama3-1-8b-instruct-v1:0', name: 'Llama 3.1 8B Instruct (US Cross-Region)', context_length: 128000, capabilities: ['chat'] },

      // Llama 3.2
      { id: 'meta.llama3-2-3b-instruct-v1:0', name: 'Llama 3.2 3B Instruct', context_length: 128000, capabilities: ['chat'] },
      { id: 'meta.llama3-2-1b-instruct-v1:0', name: 'Llama 3.2 1B Instruct', context_length: 128000, capabilities: ['chat'] },

      // Cohere
      { id: 'cohere.command-r-plus-v1:0', name: 'Command R+', context_length: 128000, capabilities: ['chat'] },
      { id: 'cohere.command-r-v1:0', name: 'Command R', context_length: 128000, capabilities: ['chat'] },

      // Mistral AI
      { id: 'mistral.mistral-large-2411-v1:0', name: 'Mistral Large 2411', context_length: 128000, capabilities: ['chat'] },
      { id: 'mistral.mistral-large-2407-v1:0', name: 'Mistral Large 2407', context_length: 128000, capabilities: ['chat'] },
      { id: 'mistral.mistral-codestral-2405-v1:0', name: 'Mistral Codestral', context_length: 32000, capabilities: ['chat'] },
      { id: 'mistral.mixtral-8x7b-instruct-v1:0', name: 'Mixtral 8x7B Instruct', context_length: 32000, capabilities: ['chat'] },
      { id: 'mistral.mistral-7b-instruct-v0:2', name: 'Mistral 7B Instruct', context_length: 32000, capabilities: ['chat'] },

      // Amazon Nova
      { id: 'amazon.nova-pro-v1:0', name: 'Amazon Nova Pro', context_length: 300000, capabilities: ['chat'] },
      { id: 'amazon.nova-lite-v1:0', name: 'Amazon Nova Lite', context_length: 300000, capabilities: ['chat'] },
      { id: 'amazon.nova-micro-v1:0', name: 'Amazon Nova Micro', context_length: 300000, capabilities: ['chat'] },
    ];
  }

  async complete(anthropicBody) {
    if (this.useOpenAICompat) {
      return this.openAICompat.complete(anthropicBody);
    }
    const modelId = anthropicBody._resolvedModel;
    const input = this.translateToBedrock(anthropicBody, modelId);
    const command = new ConverseCommand(input);
    const response = await this.client.send(command);
    return this.translateFromBedrock(response, modelId, anthropicBody._requestId, anthropicBody._prefill);
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    if (this.useOpenAICompat) {
      return this.openAICompat.completeStream(anthropicBody, res, requestId, onComplete);
    }
    const modelId = anthropicBody._resolvedModel;
    const input = this.translateToBedrock(anthropicBody, modelId);
    const command = new ConverseStreamCommand(input);
    const response = await this.client.send(command);
    await streamBedrockToAnthropic(res, response.stream, modelId, requestId, onComplete, anthropicBody._prefill);
  }

  translateToBedrock(anthropicBody, modelId) {
    const { messages, system, max_tokens, temperature, top_p, stop_sequences, tools } = anthropicBody;

    // Bedrock Converse API throws an error if the last message has role='assistant' (prefill).
    // Pop the final assistant message if present, and save its content to prepend to response logic.
    let prefill = '';
    const cleanMessages = [...(messages || [])];
    if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === 'assistant') {
      const lastMsg = cleanMessages.pop();
      if (typeof lastMsg.content === 'string') {
        prefill = lastMsg.content;
      } else if (Array.isArray(lastMsg.content)) {
        prefill = lastMsg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      }
    }
    anthropicBody._prefill = prefill;

    const bedrockMessages = [];
    for (const msg of cleanMessages) {
      const role = msg.role;
      const content = [];

      if (typeof msg.content === 'string') {
        content.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            content.push({ text: block.text });
          } else if (block.type === 'image') {
            const mime = block.source?.media_type || '';
            let format = 'jpeg';
            if (mime.includes('png')) format = 'png';
            else if (mime.includes('gif')) format = 'gif';
            else if (mime.includes('webp')) format = 'webp';

            content.push({
              image: {
                format,
                source: {
                  bytes: Buffer.from(block.source.data, 'base64'),
                },
              },
            });
          } else if (block.type === 'tool_use') {
            content.push({
              toolUse: {
                toolUseId: block.id,
                name: block.name,
                input: block.input || {},
              },
            });
          } else if (block.type === 'tool_result') {
            const isError = block.is_error;
            const textContent = Array.isArray(block.content)
              ? block.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
              : (typeof block.content === 'string' ? block.content : '');

            content.push({
              toolResult: {
                toolUseId: block.tool_use_id,
                content: [{ text: textContent || 'Success' }],
                status: isError ? 'error' : 'success',
              },
            });
          }
        }
      }

      bedrockMessages.push({ role, content });
    }

    const input = {
      modelId,
      messages: bedrockMessages,
    };

    if (system) {
      const sysText = Array.isArray(system)
        ? system.map(b => (typeof b === 'string' ? b : b.text || '')).join('\n')
        : system;
      input.system = [{ text: sysText }];
    }

    const infConfig = {};
    if (max_tokens) infConfig.maxTokens = max_tokens;
    if (temperature !== undefined) infConfig.temperature = temperature;
    if (top_p !== undefined) infConfig.topP = top_p;
    if (stop_sequences && stop_sequences.length) infConfig.stopSequences = stop_sequences;
    if (Object.keys(infConfig).length > 0) {
      input.inferenceConfiguration = infConfig;
    }

    if (tools && tools.length) {
      input.toolConfig = {
        tools: tools.map(t => ({
          toolSpec: {
            name: t.name,
            description: t.description || '',
            inputSchema: {
              json: t.input_schema || { type: 'object', properties: {} },
            },
          },
        })),
      };
    }

    return input;
  }

  translateFromBedrock(response, model, requestId, prefill) {
    const content = [];
    const bedrockContent = response.output?.message?.content || [];

    // Prepend prefill block if any
    if (prefill) {
      content.push({ type: 'text', text: prefill });
    }

    for (const block of bedrockContent) {
      if (block.text) {
        if (prefill && content.length > 0 && content[content.length - 1].type === 'text') {
          content[content.length - 1].text += block.text;
        } else {
          content.push({ type: 'text', text: block.text });
        }
      } else if (block.toolUse) {
        content.push({
          type: 'tool_use',
          id: block.toolUse.toolUseId,
          name: block.toolUse.name,
          input: block.toolUse.input,
        });
      }
    }

    let stopReason = 'end_turn';
    if (response.stopReason === 'tool_use') stopReason = 'tool_use';
    else if (response.stopReason === 'max_tokens') stopReason = 'max_tokens';
    else if (response.stopReason === 'stop_sequence') stopReason = 'stop_sequence';

    return {
      id: requestId || `msg_${crypto.randomUUID().slice(0, 24)}`,
      type: 'message',
      role: 'assistant',
      model,
      content,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: response.usage?.inputTokens || 0,
        output_tokens: response.usage?.outputTokens || 0,
      },
    };
  }
}
