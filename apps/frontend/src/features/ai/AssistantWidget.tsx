import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, Check, ChevronDown, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { api, ApiError } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

const QUICK_PROMPTS = [
  'How are sales today?',
  'What should I restock?',
  'Give me a business tip',
];

export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I’m Tally, your business assistant. What would you like to know?' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery<AIStatus>({
    queryKey: ['ai-status'],
    queryFn: () => api.get<AIStatus>('/ai/status'),
    staleTime: 60_000,
  });

  const chatMutation = useMutation({
    mutationFn: (history: Message[]) => api.post<ChatResponse>('/ai/chat', { messages: history }),
    onSuccess: (response) => {
      setError(null);
      setMessages((current) => [...current, { role: 'assistant', content: response.message }]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'I couldn’t get an answer just now. Please try again.');
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, chatMutation.isPending]);

  const sendMessage = (value = input) => {
    const content = value.trim();
    if (!content || chatMutation.isPending || !status?.available) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setError(null);
    chatMutation.mutate(next.slice(-10));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          role="dialog"
          aria-label="Tally business assistant"
          className="absolute bottom-[4.5rem] right-0 flex h-[min(36rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950"
        >
          <header className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-5 pb-5 pt-5 text-white">
            <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner">
                  <Sparkles className="h-5 w-5" />
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-violet-700 bg-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold tracking-tight">Tally Assistant</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/75">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {status?.available ? 'Ready to help' : 'Business insights, made simple'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close assistant"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <p className="relative mt-4 max-w-xs text-sm leading-relaxed text-white/85">
              Ask about sales, stock, or what to focus on next.
            </p>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 px-4 py-4 dark:bg-slate-900/70">
            {messages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <p className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-indigo-600 text-white shadow-sm'
                    : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}>
                  {message.content}
                </p>
              </div>
            ))}

            {!status?.available && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Add <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/70">GEMINI_API_KEY</code> to the backend environment to enable chat.
              </div>
            )}

            {chatMutation.isPending && (
              <div className="flex items-center gap-2 pl-9 text-xs text-slate-500 dark:text-slate-400">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Tally is thinking
              </div>
            )}
            {error && <p role="alert" className="ml-9 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            <div ref={endRef} />
          </div>

          {messages.length === 1 && status?.available && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-4 pt-3 dark:border-slate-800 dark:bg-slate-950">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            onSubmit={(event) => { event.preventDefault(); sendMessage(); }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status?.available ? 'Ask Tally anything…' : 'Assistant setup required'}
              disabled={!status?.available || chatMutation.isPending}
              rows={1}
              className="max-h-24 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900"
              aria-label="Message Tally Assistant"
            />
            <button
              type="submit"
              disabled={!input.trim() || !status?.available || chatMutation.isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-40"
              aria-label="Send message"
            >
              {chatMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <div className="flex items-center justify-center gap-1.5 bg-white pb-3 text-[10px] text-slate-400 dark:bg-slate-950">
            <Check className="h-3 w-3 text-emerald-500" /> Your business data stays private
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="group relative flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 px-4 text-white shadow-[0_12px_35px_-10px_rgba(79,70,229,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgba(79,70,229,0.8)] focus:outline-none focus:ring-4 focus:ring-indigo-500/25"
        aria-label={isOpen ? 'Close Tally Assistant' : 'Open Tally Assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Sparkles className="h-5 w-5 transition group-hover:rotate-12" /></span>}
        <span className="pr-1 text-sm font-semibold">{isOpen ? 'Close' : 'Ask Tally'}</span>
        {!isOpen && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-violet-700 bg-emerald-300" />}
      </button>
    </div>
  );
}
