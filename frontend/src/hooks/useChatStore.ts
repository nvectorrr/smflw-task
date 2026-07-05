import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { streamChat } from "../lib/chat";
import { deriveTitle } from "../lib/format";
import type { ChatMessage } from "../lib/types";

export type ConversationState = {
  messages: ChatMessage[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
};

const EMPTY: ConversationState = {
  messages: [],
  loading: true,
  streaming: false,
  error: null,
};

type Patch =
  | Partial<ConversationState>
  | ((s: ConversationState) => ConversationState);

export function useChatStore(session: Session) {
  const [byId, setById] = useState<Record<string, ConversationState>>({});
  const stateRef = useRef(byId);
  stateRef.current = byId;
  const loadedRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const controllers = abortRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, []);

  const patch = useCallback((id: string, upd: Patch) => {
    setById((prev) => {
      const cur = prev[id] ?? EMPTY;
      const next = typeof upd === "function" ? upd(cur) : { ...cur, ...upd };
      return { ...prev, [id]: next };
    });
  }, []);

  const get = useCallback(
    (id: string): ConversationState => byId[id] ?? EMPTY,
    [byId]
  );

  const load = useCallback(
    (id: string) => {
      if (loadedRef.current.has(id)) return;
      loadedRef.current.add(id);
      patch(id, { loading: true });
      supabase
        .from("messages")
        .select("id,role,content")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .then(({ data }) =>
          patch(id, (s) => ({
            ...s,
            messages: (data as ChatMessage[]) ?? [],
            loading: false,
          }))
        );
    },
    [patch]
  );

  const send = useCallback(
    async (
      id: string,
      raw: string,
      onTitle: (id: string, title: string) => void
    ) => {
      const text = raw.trim();
      if (!text || abortRef.current.has(id)) return;

      loadedRef.current.add(id);
      const isFirst = (stateRef.current[id]?.messages.length ?? 0) === 0;

      patch(id, (s) => ({
        ...s,
        error: null,
        loading: false,
        streaming: true,
        messages: [
          ...s.messages,
          { role: "user", content: text },
          { role: "assistant", content: "" },
        ],
      }));
      if (isFirst) onTitle(id, deriveTitle(text));

      const controller = new AbortController();
      abortRef.current.set(id, controller);

      try {
        await streamChat({
          token: session.access_token,
          conversationId: id,
          text,
          signal: controller.signal,
          onDelta: (delta) =>
            patch(id, (s) => {
              const copy = [...s.messages];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + delta };
              return { ...s, messages: copy };
            }),
        });
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          patch(id, { error: e instanceof Error ? e.message : String(e) });
        }
        patch(id, (s) => {
          const copy = [...s.messages];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && !last.content) copy.pop();
          return { ...s, messages: copy };
        });
      } finally {
        abortRef.current.delete(id);
        patch(id, { streaming: false });
      }
    },
    [patch, session.access_token]
  );

  return { get, load, send };
}
