import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { MICHAEL_SYSTEM_PROMPT } from "./persona";

declare const awslambda: {
  streamifyResponse: (
    fn: (event: any, responseStream: any) => Promise<void>
  ) => any;
  HttpResponseStream: {
    from: (stream: any, metadata: any) => any;
  };
};

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const MAX_HISTORY = 40;
const DEFAULT_TITLES = new Set(["New chat", "Chat with Michael"]);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function send(stream: any, obj: unknown) {
  stream.write(`data: ${JSON.stringify(obj)}\n\n`);
}

function title(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 48 ? t.slice(0, 48) + "…" : t;
}

export const handler = awslambda.streamifyResponse(
  async (event: any, responseStream: any) => {
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

    const fail = (message: string) => {
      send(stream, { error: message });
      stream.end();
    };

    try {
      const method = event.requestContext?.http?.method ?? event.httpMethod;
      if (method === "OPTIONS") {
        stream.end();
        return;
      }

      const header = event.headers?.authorization ?? event.headers?.Authorization;
      const token =
        typeof header === "string" && header.startsWith("Bearer ")
          ? header.slice(7)
          : null;
      if (!token) return fail("Not authenticated");

      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body ?? "", "base64").toString("utf8")
        : event.body ?? "{}";
      const body = JSON.parse(rawBody || "{}");
      const conversationId: string = body.conversationId;
      const text: string = (body.text ?? "").trim();
      if (!conversationId || !text)
        return fail("conversationId and text are required");

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      );

      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) return fail("Invalid or expired session");
      const userId = userData.user.id;

      const meta = (userData.user.user_metadata ?? {}) as Record<string, string>;
      const employeeName = (meta.full_name ?? "").trim();
      const employeeTitle = (meta.job_title ?? "").trim();
      let system = MICHAEL_SYSTEM_PROMPT;
      if (employeeName || employeeTitle) {
        const who = [
          employeeName && `Their name is ${employeeName}.`,
          employeeTitle && `Their role at the Scranton branch is ${employeeTitle}.`,
        ]
          .filter(Boolean)
          .join(" ");
        system += `\n\nWHO YOU ARE TALKING TO RIGHT NOW\nYou are speaking with one of your employees. ${who} Address them by their first name naturally (not every message), and tailor your boss-wisdom to their role. Never claim you don't know who they are — you are their manager, of course you know them.`;
      }

      const { data: convo, error: convoErr } = await supabase
        .from("conversations")
        .select("id,title")
        .eq("id", conversationId)
        .single();
      if (convoErr || !convo) return fail("Conversation not found");

      const { data: historyRows } = await supabase
        .from("messages")
        .select("role,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY);
      const history = (historyRows ?? []).map((r: any) => ({
        role: r.role as "user" | "assistant",
        content: r.content as string,
      }));

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: text,
      });

      if (DEFAULT_TITLES.has(convo.title)) {
        await supabase
          .from("conversations")
          .update({ title: title(text) })
          .eq("id", conversationId);
      }

      const messages = [...history, { role: "user" as const, content: text }];

      let full = "";
      const llm = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        thinking: { type: "disabled" },
        messages,
      });
      llm.on("text", (delta) => {
        full += delta;
        send(stream, { delta });
      });
      await llm.finalMessage();

      if (full.trim()) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content: full,
        });
      }

      send(stream, { done: true });
      stream.end();
    } catch (err: any) {
      const message =
        err?.error?.message ??
        err?.message ??
        "Michael got distracted. Try again in a moment.";
      try {
        send(stream, { error: message });
        stream.end();
      } catch {
        return;
      }
    }
  }
);
