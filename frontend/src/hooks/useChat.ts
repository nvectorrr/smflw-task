import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { streamChat } from "../lib/chat";
import { deriveTitle } from "../lib/format";
import type { ChatMessage } from "../lib/types";

export function useChat({
  session,
  conversationId,
  onTitle,
}: {
  session: Session;
  conversationId: string;
  onTitle: (id: string, title: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    setMessages([]);
    setError(null);
    setLoading(true);
    supabase
      .from("messages")
      .select("id,role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setMessages((data as ChatMessage[]) ?? []);
        setLoading(false);
      });
    return () => {
      alive = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [conversationId]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || streaming) return;

    setError(null);
    const isFirst = messages.length === 0;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    if (isFirst) onTitle(conversationId, deriveTitle(text));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        token: session.access_token,
        conversationId,
        text,
        signal: controller.signal,
        onDelta: (delta) =>
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + delta };
            return copy;
          }),
      });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setError(e instanceof Error ? e.message : String(e));
      }
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) copy.pop();
        return copy;
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
    }
  }

  return { messages, loading, streaming, error, send };
}
