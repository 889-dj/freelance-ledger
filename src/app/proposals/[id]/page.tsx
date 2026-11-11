import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { saveProposal, invoiceMilestone } from "@/app/actions";
import MilestoneEditor from "@/components/MilestoneEditor";
import CopyButton from "@/components/CopyButton";
import { inr } from "@/lib/format";

export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();
  const [p] = await query<{ id: number; title: string; scope_text: string; status: string; share_token: string; client_id: number; client: string }>(
    `select p.id, p.title, p.scope_text, p.status, p.share_token, p.client_id, c.name as client
     from proposals p join clients c on c.id=p.client_id where p.id=$1 and p.user_id=$2`, [pid, user.id]);
  if (!p) notFound();
  const ms = await query<{ id: number; title: string; amount: string; due_date: string | null; invoiced: string }>(
    `select m.id, m.title, m.amount, m.due_date::text as due_date,
       (select count(*) from invoices i where i.milestone_id=m.id) as invoiced
     from milestones m where m.proposal_id=$1 order by m.position, m.id`, [pid]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const share = `${proto}://${host}/p/${p.share_token}`;

  return (
    <main className="wrap page">
      <div className="stack">
        <p className="eyebrow"><Link href="/proposals">Proposals</Link> · <Link href={`/clients/${p.client_id}`}>{p.client}</Link></p>
        <div className="row between"><h1>{p.title}</h1><span className={`tag ${p.status}`}>{p.status}</span></div>
      </div>

      <form action={saveProposal.bind(null, p.id)} className="leaf stack" style={{ gap: 28 }}>
        <div className="grid2">
          <div className="field"><label htmlFor="t">Title</label><input id="t" name="title" defaultValue={p.title} required /></div>
          <div className="field">
            <label htmlFor="s">Status</label>
            <select id="s" name="status" defaultValue={p.status}>
              <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="sc">Scope of work</label><textarea id="sc" name="scope_text" defaultValue={p.scope_text} placeholder="What you will deliver, and what is not included." /></div>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Payment milestones</p>
          <MilestoneEditor initial={ms.map((m) => ({ id: m.id, title: m.title, amount: Number(m.amount), due_date: m.due_date }))} />
        </div>
        <div className="row"><button className="btn">Save proposal</button>{saved ? <span className="note">Saved</span> : null}</div>
      </form>

      {ms.length > 0 && (
        <section className="stack">
          <h2>Invoice a milestone</h2>
          <table className="ledger"><tbody>
            {ms.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td className="mono">{inr(m.amount)}</td>
                <td className="muted small">{Number(m.invoiced) ? `${m.invoiced} invoiced` : "Not invoiced"}</td>
                <td className="r">
                  <form action={invoiceMilestone}><input type="hidden" name="milestone_id" value={m.id} /><button className="btn ghost sm">Create invoice</button></form>
                </td>
              </tr>
            ))}
          </tbody></table>
        </section>
      )}

      <section className="stack" style={{ maxWidth: 720 }}>
        <h2>Share with the client</h2>
        <p className="muted">Anyone with this link can read the proposal. It shows scope and milestones, never your other clients.</p>
        <div className="codebox">{share}</div>
        <div><CopyButton text={share} label="Copy share link" /></div>
      </section>
    </main>
  );
}
