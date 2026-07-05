import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ConversationState } from "../../hooks/useChatStore";
import { MichaelAvatar } from "../../components/MichaelAvatar";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

const SUGGESTIONS = [
  "How do I request PTO next week?",
  "I have a conflict with a coworker.",
  "I could use a pep talk.",
  "What exactly are the Dundies?",
];

export function ChatConsole({
  conversationId,
  state,
  onEnsureLoaded,
  onSend,
}: {
  conversationId: string;
  state: ConversationState;
  onEnsureLoaded: (id: string) => void;
  onSend: (text: string) => void;
}) {
  const { messages, loading, streaming, error } = state;
  const [input, setInput] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onEnsureLoaded(conversationId);
  }, [conversationId, onEnsureLoaded]);

  useEffect(() => {
    setInput("");
  }, [conversationId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, showSkeleton]);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const t = setTimeout(() => setShowSkeleton(true), 160);
    return () => clearTimeout(t);
  }, [loading]);

  function submit(text: string) {
    onSend(text);
    setInput("");
  }

  const empty = !loading && messages.length === 0;

  return (
    <section className="console" aria-label="Conversation with Michael Scott">
      <header className="console__head">
        <MichaelAvatar />
        <div className="console__who">
          <strong>Michael Scott</strong>
          <span className="presence">
            <i className="presence__dot" aria-hidden="true" />
            Regional Manager · In the office
          </span>
        </div>
        <span className="console__tag">Dunder Mifflin Infinity™</span>
      </header>

      <div className="console__scroll" ref={scrollRef}>
        {showSkeleton && (
          <div className="thread">
            <div className="skeleton skeleton--michael" />
            <div className="skeleton skeleton--user" />
            <div className="skeleton skeleton--michael" />
          </div>
        )}

        {empty && (
          <div className="welcome">
            <MichaelAvatar xl />
            <h2>Michael Scott is in the office.</h2>
            <p>
              World's Best Boss, at your service. Ask about time off, a coworker
              situation, your career, or the meaning of paper. There are no bad
              questions — only bad people. Kidding. Mostly.
            </p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div
            className="thread thread--enter"
            key={conversationId}
            role="log"
            aria-live="polite"
            aria-busy={streaming}
          >
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id ?? `local-${i}`}
                message={m}
                fresh={!m.id}
                streaming={
                  streaming && i === messages.length - 1 && m.role === "assistant"
                }
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="console__error" role="alert">
          {error}
        </div>
      )}

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => submit(input)}
        busy={streaming}
      />
    </section>
  );
}
