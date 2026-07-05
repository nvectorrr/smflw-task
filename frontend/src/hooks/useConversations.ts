import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Conversation } from "../lib/types";

export function useConversations(userId: string) {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("conversations")
      .select("id,title,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setError(error.message);
          setItems([]);
          return;
        }
        const list = (data as Conversation[]) ?? [];
        setItems(list);
        setActiveId((prev) => prev ?? list[0]?.id ?? null);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const create = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "New chat" })
      .select("id,title,created_at")
      .single();
    if (error) throw error;
    const convo = data as Conversation;
    setItems((prev) => [convo, ...(prev ?? [])]);
    setActiveId(convo.id);
    return convo;
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => (prev ?? []).filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const patchTitle = useCallback((id: string, title: string) => {
    setItems((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  return { items, activeId, setActiveId, create, remove, patchTitle, error };
}
