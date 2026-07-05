import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useConversations } from "../../hooks/useConversations";
import { Wordmark } from "../../components/Wordmark";
import { MichaelAvatar } from "../../components/MichaelAvatar";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatConsole } from "./ChatConsole";
import { SettingsModal } from "../settings/SettingsModal";

export function Portal({ session, email }: { session: Session; email: string }) {
  const { items, activeId, setActiveId, create, remove, patchTitle } =
    useConversations(session.user.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayName =
    (session.user.user_metadata?.full_name as string | undefined)?.trim() || email;

  useEffect(() => {
    if (!activeId && items && items.length > 0) setActiveId(items[0].id);
  }, [activeId, items, setActiveId]);

  function select(id: string) {
    setActiveId(id);
    setDrawerOpen(false);
  }

  async function newChat() {
    await create();
    setDrawerOpen(false);
  }

  return (
    <div className="portal">
      <header className="topbar">
        <button
          className="topbar__menu"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Toggle conversations"
          aria-expanded={drawerOpen}
        >
          ☰
        </button>
        <Wordmark />
        <div className="topbar__user">
          <span className="topbar__email" title={email}>
            {displayName}
          </span>
          <button className="topbar__signout" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button className="topbar__signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="workspace">
        <div
          className={`drawer-scrim ${drawerOpen ? "drawer-scrim--open" : ""}`}
          onClick={() => setDrawerOpen(false)}
        />
        <div className={`sidebar-wrap ${drawerOpen ? "sidebar-wrap--open" : ""}`}>
          <ConversationSidebar
            items={items}
            activeId={activeId}
            onSelect={select}
            onCreate={newChat}
            onDelete={remove}
          />
        </div>

        <main className="main">
          {activeId ? (
            <ChatConsole
              session={session}
              conversationId={activeId}
              onTitle={patchTitle}
            />
          ) : (
            <div className="main__empty">
              <MichaelAvatar xl />
              <h2>Welcome to Dunder Mifflin Infinity.</h2>
              <p>Start a new conversation with Michael to get going.</p>
              <button className="composer__send" onClick={newChat}>
                ＋ New chat
              </button>
            </div>
          )}
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal session={session} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
