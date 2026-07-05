import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Message, Notice } from "../../components/ui/Message";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const register = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (!register) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              job_title: jobTitle.trim(),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice({
            text: "Account created. Check your email to confirm, then sign in.",
            error: false,
          });
        }
      }
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : String(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>{register ? "Create account" : "Sign in"}</h1>
      {register && (
        <p className="auth__sub">So Michael knows who he's talking to.</p>
      )}
      <form onSubmit={submit}>
        {register && (
          <>
            <Field
              label="full name"
              id="full-name"
              type="text"
              autoComplete="name"
              placeholder="Jim Halpert"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Field
              label="job title"
              id="job-title"
              type="text"
              autoComplete="organization-title"
              placeholder="Sales Representative"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </>
        )}
        <Field
          label="email"
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="password"
          id="password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "…" : register ? "Create account" : "Sign in"}
        </Button>
      </form>

      <button
        className="link-btn"
        onClick={() => {
          setMode(register ? "login" : "register");
          setNotice(null);
        }}
      >
        {register ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>

      <Message notice={notice} />
    </div>
  );
}
