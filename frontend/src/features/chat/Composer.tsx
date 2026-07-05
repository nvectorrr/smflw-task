import { KeyboardEvent, RefObject } from "react";
import { MAX_MESSAGE_LENGTH } from "../../lib/config";

export function Composer({
  value,
  onChange,
  onSend,
  busy,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="composer">
      <div className="composer__box">
        <textarea
          ref={inputRef}
          className="composer__input"
          placeholder="Message Michael…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          aria-label="Message Michael Scott"
          disabled={busy}
        />
        <button
          className="composer__send"
          onClick={onSend}
          disabled={busy || !value.trim()}
          aria-label="Send message"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
      <div className="composer__hint">
        <span>
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
        </span>
      </div>
    </div>
  );
}
