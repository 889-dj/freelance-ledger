import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { inr } from "@/lib/format";

export const metadata = { title: "Proposals" };

export default async function Proposals() {
  const user = await requireUser();
  const rows = await query<{ id: number; title: string; client: string; status: string; total: string; n: string }>(
    `select p.id, p.title, c.name as client, p.status, coalesce(sum(m.amount),0) as total, count(m.id) as n
     from proposals p join clients c on c.id=p.client_id left join milestones m on m.proposal_id=p.id
     where p.user_id=$1 group by p.id, c.name order by p.id desc`, [user.id]);
  return (
    <main className="wrap page">
      <h1>Proposals</h1>
      {rows.length === 0 ? (
        <div className="empty">No proposals yet. Ask Claude: <code>Draft a proposal for Acme, ₹80,000 in two milestones</code>. Or start one from a client page.</div>
      ) : (
        <table className="ledger">
          <thead><tr><th>Proposal</th><th>Status</th><th>Milestones</th><th className="r">Total</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><Link className="main" href={`/proposals/${p.id}`}>{p.title}</Link><br /><span className="small muted">{p.client}</span></td>
                <td><span className={`tag ${p.status}`}>{p.status}</span></td>
                <td className="mono">{p.n}</td>
                <td className="r mono">{inr(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
