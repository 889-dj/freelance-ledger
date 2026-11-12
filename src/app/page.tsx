import Link from "next/link";
import { getUser } from "@/lib/session";
import { query } from "@/lib/db";
import { inr, fmtDate, serial } from "@/lib/format";
import AuthPanel from "@/components/AuthPanel";

export default async function Home() {
  const user = await getUser();
  return user ? <Overview userId={user.id} /> : <Landing />;
}

function Landing() {
  return (
    <main className="wrap">
      <section className="hero">
        <div className="stack" style={{ gap: 28 }}>
          <p className="eyebrow">For freelancers who bill in rupees</p>
          <h1>Tell Claude.<br />It&rsquo;s in your <em>books.</em></h1>
          <p className="lede">
            Say who the client is, what you&rsquo;re building and when each payment falls due. Claude files the client,
            the proposal and the invoice here. You open it and fix whatever it got wrong.
          </p>
          <AuthPanel />
        </div>
        <div aria-label="Example invoice" role="img" style={{ position: "relative" }}>
          <div className="leaf" style={{ transform: "rotate(1.2deg)" }}>
            <div className="leaf-head">
              <div>
                <p className="eyebrow">Invoice · example</p>
                <p style={{ fontWeight: 800, fontSize: "1.3rem", marginTop: 8 }}>Acme Pvt Ltd</p>
              </div>
              <p className="serial"><small>No.</small>0001</p>
            </div>
            <table className="ledger" style={{ marginBottom: 8 }}>
              <tbody>
                <tr><td>Website redesign: design approved<br /><span className="small muted">50% of ₹30,000 milestone</span></td><td className="r mono">₹15,000</td></tr>
                <tr><td className="muted small">Due 1 Dec 2026</td><td className="r"></td></tr>
              </tbody>
            </table>
            <div className="row between" style={{ marginTop: 20 }}>
              <span className="tag paid">Paid</span>
              <span className="stamp thump" style={{ animationDelay: "0.9s", animationFillMode: "both" }}>Paid</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page" style={{ paddingTop: 24 }}>
        <div className="stack">
          <h2>Connect it once</h2>
          <ol className="steps">
            <li><h3>Create your workspace</h3><p className="muted">Add your name and email above. You get a private key and a ready-made connector link.</p></li>
            <li><h3>Add the connector in Claude</h3><p className="muted">Settings, Connectors, Add custom connector. Paste the link from the Connect Claude tab.</p></li>
            <li><h3>Say what happened</h3><p className="muted"><code className="say">Add Acme as a client. Website redesign, ₹80,000 in two milestones, invoice half of the first one.</code></p></li>
          </ol>
        </div>
      </section>
    </main>
  );
}

async function Overview({ userId }: { userId: number }) {
  const [unpaid, proposals, [{ out, n }]] = await Promise.all([
    query<{ id: number; number: string; client: string; amount: string; due_date: string | null }>(
      `select i.id, i.number, c.name as client, i.amount, i.due_date::text as due_date
       from invoices i join clients c on c.id=i.client_id
       where i.user_id=$1 and i.status='unpaid' order by i.due_date nulls last, i.id limit 8`, [userId]),
    query<{ id: number; title: string; client: string; status: string; total: string }>(
      `select p.id, p.title, c.name as client, p.status, coalesce(sum(m.amount),0) as total
       from proposals p join clients c on c.id=p.client_id left join milestones m on m.proposal_id=p.id
       where p.user_id=$1 and p.status <> 'accepted' group by p.id, c.name order by p.id desc limit 6`, [userId]),
    query<{ out: string; n: string }>(
      `select coalesce(sum(amount),0) as out, count(*) as n from invoices where user_id=$1 and status='unpaid'`, [userId]),
  ]);
  return (
    <main className="wrap page">
      <section className="stack">
        <p className="eyebrow">Outstanding</p>
        <div className="total-hero">
          <span className="mono">{inr(out)}</span>
          <span className="muted">across {n} unpaid {Number(n) === 1 ? "invoice" : "invoices"}</span>
        </div>
      </section>

      <div className="grid2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48 }}>
        <section>
          <div className="section-head"><h2>Waiting on payment</h2><Link href="/invoices">All invoices</Link></div>
          {unpaid.length === 0 ? (
            <div className="empty">No unpaid invoices. In Claude, try <code>Invoice the first milestone for Acme</code>.</div>
          ) : (
            <table className="ledger">
              <thead><tr><th>No.</th><th>Client</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {unpaid.map((i) => (
                  <tr key={i.id}>
                    <td><Link className="main mono" style={{ color: "var(--red)" }} href={`/invoices/${i.id}`}>{serial(i.number)}</Link></td>
                    <td>{i.client}<br /><span className="small muted">Due {fmtDate(i.due_date)}</span></td>
                    <td className="r mono">{inr(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section>
          <div className="section-head"><h2>Proposals in play</h2><Link href="/proposals">All proposals</Link></div>
          {proposals.length === 0 ? (
            <div className="empty">No open proposals. In Claude, try <code>Draft a proposal for Acme with three milestones</code>.</div>
          ) : (
            <table className="ledger">
              <thead><tr><th>Proposal</th><th>Status</th><th className="r">Total</th></tr></thead>
              <tbody>
                {proposals.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="main" href={`/proposals/${p.id}`}>{p.title}</Link><br /><span className="small muted">{p.client}</span></td>
                    <td><span className={`tag ${p.status}`}>{p.status}</span></td>
                    <td className="r mono">{inr(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
