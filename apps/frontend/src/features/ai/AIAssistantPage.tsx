import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  dataTimestamp?: string;
  isError?: boolean;
}

interface AIStatus {
  available: boolean;
  model: string;
  message: string;
}

interface ChatResponse {
  message: string;
  toolsUsed: string[];
  dataTimestamp: string;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-primary' : 'bg-muted border border-border',
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-primary-foreground" />
          : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : msg.isError
          ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-sm'
          : 'bg-muted rounded-tl-sm',
      )}>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <p className={cn(
            'text-xs mt-1.5 opacity-60',
            isUser ? 'text-primary-foreground' : 'text-muted-foreground',
          )}>
            📊 Used: {msg.toolsUsed.map((t) => t.replace(/_/g, ' ')).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted border border-border flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: status } = useQuery<AIStatus>({
    queryKey: ['ai-status'],
    queryFn: () => api.get<AIStatus>('/ai/status'),
    staleTime: 60_000,
  });

  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['ai-suggestions'],
    queryFn: () => api.get<string[]>('/ai/suggestions'),
    staleTime: 300_000,
  });

  const chatMutation = useMutation({
    mutationFn: (msgs: Message[]) =>
      api.post<ChatResponse>('/ai/chat', { messages: msgs }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          toolsUsed: data.toolsUsed,
          dataTimestamp: data.dataTimestamp,
        },
      ]);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg, isError: true },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || chatMutation.isPending) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content },
    ];
    setMessages(newMessages);
    setInput('');
    inputRef.current?.focus();

    // Only send last 10 messages to API to keep context manageable
    const apiMessages = newMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    chatMutation.mutate(apiMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold">AI Business Assistant</h1>
          <p className="text-xs text-muted-foreground">
            {status?.available
              ? `Powered by ${status.model}`
              : status
              ? 'Configuration required'
              : 'Loading...'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      {/* Not configured banner */}
      {status && !status.available && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-start gap-2.5 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-500">API key required</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Add <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GEMINI_API_KEY</code> to your
              backend environment. Get one free at{' '}
              <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="underline">
                ai.google.dev
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">How can I help?</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ask me about your sales, inventory, and business performance.
              I'll pull real data to answer your questions.
            </p>

            {/* Suggestion chips */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
                {suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={!status?.available}
                    className="px-3 py-1.5 text-sm rounded-full border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {chatMutation.isPending && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status?.available ? 'Ask about your business...' : 'Configure API key to start'}
            disabled={chatMutation.isPending || !status?.available}
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || chatMutation.isPending || !status?.available}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Answers are based on your actual business data. Always verify critical decisions.
        </p>
      </div>
    </div>
  );
}
