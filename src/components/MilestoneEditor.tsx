"use client";
import { useState } from "react";
import { inr } from "@/lib/format";

type M = { id?: number; title: string; amount: number; due_date: string | null };

export default function MilestoneEditor({ initial }: { initial: M[] }) {
  const [rows, setRows] = useState(() => initial.map((m, i) => ({ ...m, key: `${m.id}-${i}` })));
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const patch = (k: string, p: Partial<M>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...p } : r)));
  return (
    <div>
      {rows.length === 0 ? <p className="muted" style={{ padding: "12px 0" }}>No payment milestones yet. Add the first one below.</p> : null}
      {rows.map((r, i) => (
        <div className="ms" key={r.key}>
          <input type="hidden" name="m_id" value={r.id ?? ""} />
          <div className="field t">
            <label htmlFor={`mt${i}`}>Milestone</label>
            <input id={`mt${i}`} name="m_title" value={r.title} onChange={(e) => patch(r.key, { title: e.target.value })} placeholder="e.g. Design approved" />
          </div>
          <div className="field">
            <label htmlFor={`ma${i}`}>Amount (₹)</label>
            <input id={`ma${i}`} name="m_amount" className="num" inputMode="decimal" value={r.amount || ""} onChange={(e) => patch(r.key, { amount: Number(e.target.value.replaceAll(",", "")) || 0 })} />
          </div>
          <div className="field">
            <label htmlFor={`md${i}`}>Due</label>
            <input id={`md${i}`} name="m_due" type="date" value={r.due_date ?? ""} onChange={(e) => patch(r.key, { due_date: e.target.value || null })} />
          </div>
          <button type="button" className="x" aria-label={`Remove milestone ${r.title || i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>×</button>
        </div>
      ))}
      <div className="row between" style={{ marginTop: 16 }}>
        <button type="button" className="btn ghost sm" onClick={() => setRows((rs) => [...rs, { title: "", amount: 0, due_date: null, key: `new-${Date.now()}` }])}>+ Add milestone</button>
        <div className="total-line" style={{ border: 0, padding: 0 }}>
          <span className="eyebrow" style={{ marginRight: 12 }}>Total</span>
          <span className="mono" style={{ fontSize: "1.3rem", borderBottom: "4px double var(--ink)" }}>{inr(total)}</span>
        </div>
      </div>
    </div>
  );
}
