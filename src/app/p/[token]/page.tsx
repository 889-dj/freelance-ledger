import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const metadata = { title: "Proposal" };

export default async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [p] = await query<{ id: number; title: string; scope_text: string; status: string; client: string; freelancer: string }>(
    `select p.id, p.title, p.scope_text, p.status, c.name as client, u.name as freelancer
     from proposals p join clients c on c.id=p.client_id join users u on u.id=p.user_id where p.share_token=$1`, [token]);
  if (!p) notFound();
  const ms = await query<{ title: string; amount: string; due_date: string | null }>(
    "select title, amount, due_date::text as due_date from milestones where proposal_id=$1 order by position, id", [p.id]);
  const total = ms.reduce((s, m) => s + Number(m.amount), 0);
  return (
    <main className="wrap page">
      <div className="leaf" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div className="leaf-head">
          <div>
            <p className="eyebrow">Proposal from {p.freelancer}</p>
            <h1 style={{ fontSize: "2rem", marginTop: 10 }}>{p.title}</h1>
            <p className="muted" style={{ marginTop: 6 }}>Prepared for {p.client}</p>
          </div>
          <span className={`tag ${p.status}`}>{p.status}</span>
        </div>
        <h2 style={{ marginBottom: 10 }}>Scope of work</h2>
        <p style={{ whiteSpace: "pre-wrap", marginBottom: 32 }}>{p.scope_text || "Scope to be confirmed."}</p>
        <h2 style={{ marginBottom: 10 }}>Payment schedule</h2>
        <table className="ledger"><tbody>
          {ms.map((m, i) => (
            <tr key={i}><td>{m.title}</td><td className="muted">{fmtDate(m.due_date)}</td><td className="r mono">{inr(m.amount)}</td></tr>
          ))}
        </tbody></table>
        <div className="total-line"><span>Total</span><span className="mono">{inr(total)}</span></div>
      </div>
    </main>
  );
}
