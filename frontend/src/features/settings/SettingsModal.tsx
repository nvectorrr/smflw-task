import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Message, Notice } from "../../components/ui/Message";
import { MAX_NAME_LENGTH, MAX_TITLE_LENGTH } from "../../lib/config";

export function SettingsModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  const [fullName, setFullName] = useState(meta.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(meta.job_title ?? "");
  const [password, setPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [pwNotice, setPwNotice] = useState<Notice>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), job_title: jobTitle.trim() },
    });
    setProfileNotice(
      error
        ? { text: error.message, error: true }
        : { text: "Saved. Michael's been briefed.", error: false }
    );
    setSavingProfile(false);
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwNotice(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPwNotice({ text: error.message, error: true });
    } else {
      setPwNotice({ text: "Password updated.", error: false });
      setPassword("");
    }
    setSavingPw(false);
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id="settings-title">Employee settings</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>

        <div className="modal__body">
          <form className="modal__section" onSubmit={saveProfile}>
            <div className="modal__label">Profile</div>
            <Field
              label="full name"
              id="settings-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={MAX_NAME_LENGTH}
            />
            <Field
              label="job title"
              id="settings-title-field"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              maxLength={MAX_TITLE_LENGTH}
            />
            <div className="modal__readonly">
              Signed in as <b>{session.user.email}</b>
            </div>
            <Button variant="primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "…" : "Save profile"}
            </Button>
            <Message notice={profileNotice} />
          </form>

          <form className="modal__section" onSubmit={savePassword}>
            <div className="modal__label">Security</div>
            <Field
              label="new password"
              id="settings-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button variant="primary" type="submit" disabled={savingPw}>
              {savingPw ? "…" : "Update password"}
            </Button>
            <Message notice={pwNotice} />
          </form>
        </div>
      </div>
    </div>
  );
}
