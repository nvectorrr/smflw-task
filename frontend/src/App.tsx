import { useSession } from "./hooks/useSession";
import { Splash } from "./components/Splash";
import { AuthScreen } from "./features/auth/AuthScreen";
import { Portal } from "./features/chat/Portal";

export function App() {
  const { session, ready } = useSession();

  if (!ready) return <Splash />;
  if (!session) return <AuthScreen />;

  return <Portal session={session} email={session.user.email ?? ""} />;
}
