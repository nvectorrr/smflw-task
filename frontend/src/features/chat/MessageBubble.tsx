import { Markdown } from "../../components/Markdown";
import { MichaelAvatar } from "../../components/MichaelAvatar";
import { TypingDots } from "./TypingDots";
import type { ChatMessage } from "../../lib/types";

export function MessageBubble({
  message,
  streaming,
  fresh,
}: {
  message: ChatMessage;
  streaming?: boolean;
  fresh?: boolean;
}) {
  const mine = message.role === "user";
  const waiting = streaming && message.content.length === 0;

  return (
    <div
      className={
        `bubble-row ${mine ? "bubble-row--user" : "bubble-row--michael"}` +
        (fresh ? " bubble-row--fresh" : "")
      }
    >
      {!mine && <MichaelAvatar />}
      <div className="bubble">
        {!mine && <div className="bubble__memo">Michael Scott · re: your message</div>}
        {waiting ? (
          <div className="bubble__text">
            <TypingDots />
          </div>
        ) : mine ? (
          <div className="bubble__text bubble__text--plain">{message.content}</div>
        ) : (
          <div className="bubble__text">
            <Markdown>{message.content}</Markdown>
            {streaming && <span className="cursor" aria-hidden="true" />}
          </div>
        )}
      </div>
      {mine && (
        <div className="avatar avatar--user" aria-hidden="true">
          You
        </div>
      )}
    </div>
  );
}
