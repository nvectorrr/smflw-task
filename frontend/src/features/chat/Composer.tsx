import { KeyboardEvent } from "react";

export function Composer({
  value,
  onChange,
  onSend,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
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
          className="composer__input"
          placeholder="Message Michael…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
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
