const CHAT_URL = import.meta.env.VITE_CHAT_URL;

type StreamOptions = {
  token: string;
  conversationId: string;
  text: string;
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
};

export async function streamChat({
  token,
  conversationId,
  text,
  onDelta,
  signal,
}: StreamOptions): Promise<void> {
  if (!CHAT_URL) throw new Error("Chat endpoint is not configured");

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, text }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Michael's line is busy (HTTP ${res.status}). Try again.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      const event = JSON.parse(payload) as {
        delta?: string;
        done?: boolean;
        error?: string;
      };
      if (event.error) throw new Error(event.error);
      if (event.delta) onDelta(event.delta);
      if (event.done) return;
    }
  }
}
