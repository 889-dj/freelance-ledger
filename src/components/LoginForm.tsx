"use client";
import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="key-form">
      <div className="field">
        <label htmlFor="key">Workspace key</label>
        <input id="key" name="key" placeholder="wk_…" autoComplete="off" spellCheck={false} required className="mono" />
      </div>
      {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
      <div><button className="btn" disabled={pending}>{pending ? "Opening…" : "Open ledger"}</button></div>
    </form>
  );
}
