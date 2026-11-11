import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { saveClient, createProposal, createInvoice } from "@/app/actions";
import { inr, fmtDate, serial } from "@/lib/format";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const cid = Number(id);
  if (!Number.isInteger(cid)) notFound();
  const [c] = await query<{ id: number; name: string; email: string | null; company: string | null }>(
    "select id, name, email, company from clients where id=$1 and user_id=$2", [cid, user.id]);
  if (!c) notFound();
  const [proposals, invoices] = await Promise.all([
    query<{ id: number; title: string; status: string; total: string }>(
      `select p.id, p.title, p.status, coalesce(sum(m.amount),0) as total from proposals p
       left join milestones m on m.proposal_id=p.id where p.client_id=$1 group by p.id order by p.id desc`, [cid]),
    query<{ id: number; number: string; amount: string; status: string; due_date: string | null }>(
      "select id, number, amount, status, due_date::text as due_date from invoices where client_id=$1 order by id desc", [cid]),
  ]);
  return (
    <main className="wrap page">
      <div className="stack">
        <p className="eyebrow"><Link href="/clients">Clients</Link></p>
        <h1>{c.name}</h1>
      </div>
      <form action={saveClient.bind(null, c.id)} className="stack" style={{ maxWidth: 720, gap: 20 }}>
        <div className="grid2">
          <div className="field"><label htmlFor="n">Name</label><input id="n" name="name" defaultValue={c.name} required /></div>
          <div className="field"><label htmlFor="c">Company</label><input id="c" name="company" defaultValue={c.company ?? ""} /></div>
          <div className="field"><label htmlFor="e">Email</label><input id="e" name="email" type="email" defaultValue={c.email ?? ""} /></div>
        </div>
        <div className="row"><button className="btn">Save client</button>{saved ? <span className="note">Saved</span> : null}</div>
      </form>

      <section>
        <div className="section-head"><h2>Proposals</h2></div>
        {proposals.length ? (
          <table className="ledger"><tbody>
            {proposals.map((p) => (
              <tr key={p.id}><td><Link className="main" href={`/proposals/${p.id}`}>{p.title}</Link></td><td><span className={`tag ${p.status}`}>{p.status}</span></td><td className="r mono">{inr(p.total)}</td></tr>
            ))}
          </tbody></table>
        ) : <p className="muted">None yet.</p>}
        <form action={createProposal} className="row" style={{ marginTop: 20, alignItems: "end" }}>
          <input type="hidden" name="client_id" value={c.id} />
          <div className="field" style={{ minWidth: 260, flex: 1, maxWidth: 420 }}><label htmlFor="pt">New proposal title</label><input id="pt" name="title" placeholder="e.g. Website redesign" /></div>
          <button className="btn ghost">Start proposal</button>
        </form>
      </section>

      <section>
        <div className="section-head"><h2>Invoices</h2></div>
        {invoices.length ? (
          <table className="ledger"><tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td><Link className="main mono" style={{ color: "var(--red)" }} href={`/invoices/${i.id}`}>{serial(i.number)}</Link></td>
                <td className="muted">Due {fmtDate(i.due_date)}</td>
                <td><span className={`tag ${i.status}`}>{i.status}</span></td>
                <td className="r mono">{inr(i.amount)}</td>
              </tr>
            ))}
          </tbody></table>
        ) : <p className="muted">None yet.</p>}
        <form action={createInvoice} className="row" style={{ marginTop: 20, alignItems: "end" }}>
          <input type="hidden" name="client_id" value={c.id} />
          <div className="field" style={{ width: 180 }}><label htmlFor="ia">Amount (₹)</label><input id="ia" name="amount" className="num" inputMode="decimal" required /></div>
          <div className="field" style={{ width: 180 }}><label htmlFor="id">Due</label><input id="id" name="due_date" type="date" /></div>
          <button className="btn ghost">Create invoice</button>
        </form>
      </section>
    </main>
  );
}
