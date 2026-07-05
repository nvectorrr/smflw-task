import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { MICHAEL_SYSTEM_PROMPT } from "./persona";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 900;
const MAX_HISTORY = 40;
const MAX_EMAIL_LENGTH = 8000;
const MAILSLURP_BASE = "https://api.mailslurp.com";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function ok(body: unknown = { ok: true }) {
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function mailslurp(path: string, init?: RequestInit) {
  const res = await fetch(`${MAILSLURP_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": process.env.MAILSLURP_KEY!,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`MailSlurp ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

function senderAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

function toPlainText(body: string): string {
  const looksHtml = /<[a-z][\s\S]*>/i.test(body);
  const text = looksHtml
    ? body
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
    : body;
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

function stripEmailHeader(text: string): string {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const isHeader = /^\*{0,2}(to|from|re|subject|cc|bcc|date)\*{0,2}\s*:/i.test(line);
    if (line === "" || /^-{3,}$/.test(line) || isHeader) i++;
    else break;
  }
  return lines.slice(i).join("\n").trim();
}

function threadKey(subject: string): string {
  return subject
    .replace(/^\s*(re|fwd|fw)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 120) || "email";
}

export const handler = async (event: any) => {
  try {
    const method = event.requestContext?.http?.method ?? event.httpMethod;
    if (method === "OPTIONS") return { statusCode: 204 };

    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body ?? "{}";
    const payload = JSON.parse(raw || "{}");
    const emailId: string | undefined = payload.emailId ?? payload.id;
    if (!emailId) return ok({ ignored: "no emailId" });

    const email = (await mailslurp(`/emails/${emailId}`)) as {
      from?: string;
      subject?: string;
      body?: string;
      inboxId?: string;
    };
    const inboxId: string | undefined = payload.inboxId ?? email.inboxId;
    const sender = senderAddress(email.from ?? "");
    const subject = (email.subject ?? "(no subject)").trim();
    const text = toPlainText(email.body ?? "").slice(0, MAX_EMAIL_LENGTH);
    if (!sender || !text) return ok({ ignored: "empty" });

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, job_title")
      .eq("email", sender)
      .maybeSingle();
    if (!profile) return ok({ ignored: "unknown sender", sender });

    const userId = profile.id as string;
    const key = threadKey(subject);

    let { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "email")
      .eq("email_thread_id", key)
      .maybeSingle();

    if (!convo) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          source: "email",
          email_thread_id: key,
          title: subject.slice(0, 80),
        })
        .select("id")
        .single();
      convo = created;
    }
    const conversationId = convo!.id as string;

    const { data: historyRows } = await supabase
      .from("messages")
      .select("role, content")
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

    const name = (profile.full_name ?? "").trim();
    const jobTitle = (profile.job_title ?? "").trim();
    const who = [
      name && `Their name is ${name}.`,
      jobTitle && `Their role at the Scranton branch is ${jobTitle}.`,
    ]
      .filter(Boolean)
      .join(" ");
    const system =
      MICHAEL_SYSTEM_PROMPT +
      `\n\nYOU ARE REPLYING TO AN EMAIL from one of your employees. ${who} Start directly with a greeting to them by name, then reply in character, and sign off at the end as "— Michael" (or a Michael-style sign-off). Do NOT write an email header block at the top — no "To:", "From:", "Subject:", "Re:", or "Date:" lines and no "---" separator. Just the message itself. Keep it readable — this is an email, not chat.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      thinking: { type: "disabled" },
      messages: [...history, { role: "user", content: text }],
    });
    const reply = stripEmailHeader(
      message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
    );

    if (reply) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "assistant",
        content: reply,
      });
      if (inboxId) {
        const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
        await mailslurp(`/inboxes/${inboxId}`, {
          method: "POST",
          body: JSON.stringify({
            to: [sender],
            subject: replySubject,
            body: reply,
            isHTML: false,
          }),
        });
      }
    }

    return ok({ replied: true });
  } catch (err: any) {
    console.error("email handler error", err?.message ?? err);
    return ok({ error: err?.message ?? "failed" });
  }
};
