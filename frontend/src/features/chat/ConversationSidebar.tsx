import { timeAgo } from "../../lib/format";
import type { Conversation } from "../../lib/types";

export function ConversationSidebar({
  items,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  items: Conversation[] | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <nav className="sidebar" aria-label="Conversations">
      <button className="sidebar__new" onClick={onCreate}>
        <span aria-hidden="true">＋</span> New chat
      </button>

      <div className="sidebar__label">
        Conversations
        {items && items.length > 0 && (
          <span className="sidebar__count">{items.length}</span>
        )}
      </div>

      <div className="sidebar__list">
        {items === null && (
          <>
            <div className="convo-skeleton" />
            <div className="convo-skeleton" />
            <div className="convo-skeleton" />
          </>
        )}

        {items !== null && items.length === 0 && (
          <p className="sidebar__empty">No conversations yet. Start one above.</p>
        )}

        {items?.map((c) => (
          <div
            key={c.id}
            className={`convo ${c.id === activeId ? "convo--active" : ""}`}
          >
            <button
              className="convo__open"
              onClick={() => onSelect(c.id)}
              aria-current={c.id === activeId}
            >
              <span className="convo__title">
                {c.source === "email" && (
                  <span className="convo__badge" title="Received by email">
                    ✉
                  </span>
                )}
                {c.title}
              </span>
              <span className="convo__time">{timeAgo(c.created_at)}</span>
            </button>
            <button
              className="convo__delete"
              onClick={() => onDelete(c.id)}
              aria-label={`Delete conversation ${c.title}`}
              title="Delete conversation"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar__foot">Scranton Branch · Est. 2001</div>
    </nav>
  );
}
