import { Wordmark } from "../../components/Wordmark";
import { AuthPanel } from "./AuthPanel";

export function AuthScreen() {
  return (
    <div className="auth-screen">
      <aside className="auth-hero">
        <Wordmark />
        <h1>Talk to your Regional Manager.</h1>
        <p>
          Dunder Mifflin Infinity connects every employee directly with Michael
          Scott — the World's Best Boss. Sign in to start the conversation.
        </p>
        <blockquote>
          “Would I rather be feared or loved? Easy. Both. I want people to be
          afraid of how much they love me.”
          <cite>— Michael Scott</cite>
        </blockquote>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <AuthPanel />
        </div>
      </main>
    </div>
  );
}
