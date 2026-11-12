"use client";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions";

export default function AuthPanel() {
  const [mode, setMode] = useState<"new" | "key">("new");
  const [signupState, signupAction, signing] = useActionState(signup, undefined);
  const [loginState, loginAction, logging] = useActionState(login, undefined);
  return (
    <div className="stack" style={{ gap: 18, maxWidth: 440 }}>
      <div className="tabs" role="group" aria-label="Get started">
        <button type="button" aria-pressed={mode === "new"} onClick={() => setMode("new")}>Create workspace</button>
        <button type="button" aria-pressed={mode === "key"} onClick={() => setMode("key")}>I have a key</button>
      </div>
      {mode === "new" ? (
        <form action={signupAction} className="key-form" key="new">
          <div className="field"><label htmlFor="su-name">Your name</label><input id="su-name" name="name" autoComplete="name" required /></div>
          <div className="field"><label htmlFor="su-email">Email</label><input id="su-email" name="email" type="email" autoComplete="email" required /></div>
          {signupState?.error ? <p className="err" role="alert">{signupState.error}</p> : null}
          <div><button className="btn" disabled={signing}>{signing ? "Creating…" : "Create my workspace"}</button></div>
          <p className="small muted">You get a private workspace key. It opens this site and lets Claude write to your ledger.</p>
        </form>
      ) : (
        <form action={loginAction} className="key-form" key="key">
          <div className="field">
            <label htmlFor="key">Workspace key</label>
            <input id="key" name="key" placeholder="wk_…" autoComplete="off" spellCheck={false} required className="mono" />
          </div>
          {loginState?.error ? <p className="err" role="alert">{loginState.error}</p> : null}
          <div><button className="btn" disabled={logging}>{logging ? "Opening…" : "Open ledger"}</button></div>
        </form>
      )}
    </div>
  );
}
