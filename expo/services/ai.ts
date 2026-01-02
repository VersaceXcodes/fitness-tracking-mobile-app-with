/**
 * LaunchPulse AI Client for Expo/React Native
 *
 * This client provides an OpenAI-compatible API that routes all AI calls through
 * the LaunchPulse platform proxy. This allows generated apps to use AI features
 * without needing to manage their own API keys.
 *
 * Environment Variables (auto-injected by LaunchPulse):
 * - EXPO_PUBLIC_LAUNCHPULSE_AI_KEY: API token for authentication
 * - EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID: Project identifier
 * - EXPO_PUBLIC_LAUNCHPULSE_API_URL: Platform API URL
 */

import Constants from 'expo-constants';

// Get environment variables from Expo
const getEnvVar = (key: string): string | undefined => {
  // Try expo-constants first (works in most Expo environments)
  const extra = Constants.expoConfig?.extra?.[key];
  if (extra) return extra;

  // Fallback to process.env for web builds
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)[key];
  }

  return undefined;
};

const env = {
  LAUNCHPULSE_AI_KEY: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_AI_KEY'),
  LAUNCHPULSE_PROJECT_ID: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID'),
  LAUNCHPULSE_API_URL: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_API_URL') || 'https://launchpulse.ai',
};

const hasLaunchPulseEnv =
  env.LAUNCHPULSE_AI_KEY &&
  env.LAUNCHPULSE_PROJECT_ID &&
  env.LAUNCHPULSE_API_URL;

// AI error class
class AIError extends Error {
  type: string;
  code?: string;
  credits_remaining?: number;

  constructor(message: string, type: string, code?: string, credits_remaining?: number) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.code = code;
    this.credits_remaining = credits_remaining;
  }
}

// Message types (OpenAI-compatible)
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
}

interface ChatCompletionParams {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}

// Make request to LaunchPulse AI proxy
async function makeAIRequest<T>(
  params: ChatCompletionParams,
  streaming: false
): Promise<T>;
async function makeAIRequest(
  params: ChatCompletionParams,
  streaming: true
): Promise<Response>;
async function makeAIRequest<T>(
  params: ChatCompletionParams,
  streaming: boolean
): Promise<T | Response> {
  if (!hasLaunchPulseEnv) {
    throw new AIError(
      'LaunchPulse AI integration not configured. Please check your environment variables.',
      'configuration_error',
      'AI_NOT_CONFIGURED'
    );
  }

  const response = await fetch(`${env.LAUNCHPULSE_API_URL}/api/ai/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: env.LAUNCHPULSE_PROJECT_ID,
      token: env.LAUNCHPULSE_AI_KEY,
      messages: params.messages,
      model: params.model || 'google/gemini-2.0-flash-001',
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      stream: streaming,
    }),
  });

  if (!response.ok) {
    let error;
    try {
      const errorData = await response.json();
      error = (errorData as any).error || { message: 'An error occurred', type: 'api_error' };
    } catch {
      error = { message: `Request failed with status ${response.status}`, type: 'api_error' };
    }
    throw new AIError(error.message, error.type, error.code, error.credits_remaining);
  }

  if (streaming) {
    return response;
  }

  return response.json() as Promise<T>;
}

// Parse SSE stream chunks (React Native compatible)
async function* parseSSEStream(
  response: Response
): AsyncGenerator<StreamChunk, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new AIError('No response body for streaming', 'api_error', 'NO_STREAM_BODY');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            yield json as StreamChunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// AI Client class
class AIClient {
  chat = {
    completions: {
      /**
       * Create a chat completion
       * @example
       * const response = await ai.chat.completions.create({
       *   messages: [{ role: 'user', content: 'Hello!' }],
       * });
       * console.log(response.choices[0].message.content);
       */
      create: async (params: ChatCompletionParams): Promise<ChatCompletionResponse> => {
        if (params.stream) {
          throw new AIError(
            'Use ai.chat.completions.stream() for streaming responses',
            'invalid_request_error',
            'USE_STREAM_METHOD'
          );
        }
        return makeAIRequest<ChatCompletionResponse>(params, false);
      },

      /**
       * Create a streaming chat completion
       * @example
       * for await (const chunk of ai.chat.completions.stream({
       *   messages: [{ role: 'user', content: 'Tell me a story' }],
       * })) {
       *   console.log(chunk); // prints each text chunk
       * }
       */
      stream: async function* (
        params: Omit<ChatCompletionParams, 'stream'>
      ): AsyncGenerator<string, void, unknown> {
        const response = await makeAIRequest({ ...params, stream: true }, true);

        for await (const chunk of parseSSEStream(response)) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      },

      /**
       * Create a streaming chat completion with full chunk data
       */
      streamChunks: async function* (
        params: Omit<ChatCompletionParams, 'stream'>
      ): AsyncGenerator<StreamChunk, void, unknown> {
        const response = await makeAIRequest({ ...params, stream: true }, true);
        yield* parseSSEStream(response);
      },
    },
  };

  /**
   * Simple chat helper - send a message and get a response
   * @example
   * const reply = await ai.ask('What is the capital of France?');
   * console.log(reply); // "Paris"
   */
  async ask(
    content: string,
    options: {
      systemPrompt?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<string> {
    const messages: Message[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content });

    const response = await this.chat.completions.create({
      messages,
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Streaming chat helper - send a message and get a streaming response
   * @example
   * for await (const chunk of ai.askStream('Tell me a joke')) {
   *   console.log(chunk);
   * }
   */
  async *askStream(
    content: string,
    options: {
      systemPrompt?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const messages: Message[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content });

    yield* this.chat.completions.stream({
      messages,
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    });
  }
}

// Export the client
const ai = new AIClient();

export default ai;
export { ai, AIClient, AIError };
export type {
  Message,
  ChatCompletionChoice,
  ChatCompletionUsage,
  ChatCompletionResponse,
  ChatCompletionParams,
  StreamChunk,
};
