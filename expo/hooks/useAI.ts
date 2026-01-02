/**
 * useAI - React Native hook for AI chat functionality
 *
 * Provides a simple interface for managing AI conversations with
 * automatic state management, streaming support, and error handling.
 *
 * @example
 * function ChatScreen() {
 *   const { messages, send, isLoading, error } = useChat();
 *
 *   return (
 *     <View>
 *       <FlatList
 *         data={messages}
 *         renderItem={({ item }) => (
 *           <Text>{item.role}: {item.content}</Text>
 *         )}
 *       />
 *       <Button title="Send" onPress={() => send('Hello!')} />
 *     </View>
 *   );
 * }
 */

import { useState, useCallback, useRef } from 'react';
import { ai, type Message } from '../services/ai';

interface UseChatOptions {
  /** System prompt to include at the start of every conversation */
  systemPrompt?: string;
  /** Model to use (defaults to project config) */
  model?: string;
  /** Temperature for sampling (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Initial messages to start the conversation */
  initialMessages?: Message[];
  /** Callback when a message is sent */
  onSend?: (content: string) => void;
  /** Callback when AI responds */
  onResponse?: (content: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseChatReturn {
  /** All messages in the conversation */
  messages: Message[];
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Current error, if any */
  error: Error | null;
  /** Send a message and get a response */
  send: (content: string) => Promise<void>;
  /** Send a message with streaming response */
  sendStream: (content: string) => Promise<void>;
  /** Clear all messages */
  clear: () => void;
  /** Stop current streaming response */
  stop: () => void;
  /** Add a message without sending to AI */
  addMessage: (message: Message) => void;
  /** Current streaming content (updates as chunks arrive) */
  streamingContent: string;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    systemPrompt,
    model,
    temperature,
    max_tokens,
    initialMessages = [],
    onSend,
    onResponse,
    onError,
  } = options;

  const [messages, setMessages] = useState<Message[]>(() => {
    const initial: Message[] = [];
    if (systemPrompt) {
      initial.push({ role: 'system', content: systemPrompt });
    }
    return [...initial, ...initialMessages];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  const shouldStopRef = useRef(false);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clear = useCallback(() => {
    const initial: Message[] = [];
    if (systemPrompt) {
      initial.push({ role: 'system', content: systemPrompt });
    }
    setMessages(initial);
    setError(null);
    setStreamingContent('');
  }, [systemPrompt]);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMessage: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      onSend?.(content);

      try {
        const response = await ai.chat.completions.create({
          messages: [...messages, userMessage],
          model,
          temperature,
          max_tokens,
        });

        const assistantContent = response.choices[0]?.message?.content || '';
        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantContent,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        onResponse?.(assistantContent);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, model, temperature, max_tokens, onSend, onResponse, onError]
  );

  const sendStream = useCallback(
    async (content: string) => {
      if (isLoading || isStreaming) return;

      const userMessage: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingContent('');
      setError(null);
      shouldStopRef.current = false;
      onSend?.(content);

      let fullContent = '';

      try {
        for await (const chunk of ai.chat.completions.stream({
          messages: [...messages, userMessage],
          model,
          temperature,
          max_tokens,
        })) {
          if (shouldStopRef.current) break;

          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: fullContent,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
        onResponse?.(fullContent);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        shouldStopRef.current = false;
      }
    },
    [isLoading, isStreaming, messages, model, temperature, max_tokens, onSend, onResponse, onError]
  );

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    send,
    sendStream,
    clear,
    stop,
    addMessage,
    streamingContent,
  };
}

/**
 * useAsk - Simple hook for one-off AI questions
 *
 * @example
 * function QuestionScreen() {
 *   const { ask, response, isLoading, error } = useAsk();
 *
 *   return (
 *     <View>
 *       <Button title="Ask" onPress={() => ask('What is 2+2?')} />
 *       {isLoading && <Text>Thinking...</Text>}
 *       {response && <Text>Answer: {response}</Text>}
 *       {error && <Text>Error: {error.message}</Text>}
 *     </View>
 *   );
 * }
 */
interface UseAskOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface UseAskReturn {
  /** Ask a question and get a response */
  ask: (content: string) => Promise<string>;
  /** The last response */
  response: string | null;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Current error, if any */
  error: Error | null;
  /** Clear the response */
  clear: () => void;
}

export function useAsk(options: UseAskOptions = {}): UseAskReturn {
  const { systemPrompt, model, temperature, max_tokens } = options;

  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ask = useCallback(
    async (content: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ai.ask(content, {
          systemPrompt,
          model,
          temperature,
          max_tokens,
        });

        setResponse(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [systemPrompt, model, temperature, max_tokens]
  );

  const clear = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    ask,
    response,
    isLoading,
    error,
    clear,
  };
}

export default useChat;
