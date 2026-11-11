import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { createClient } from "@/app/actions";
import { inr } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function Clients() {
  const user = await requireUser();
  const rows = await query<{ id: number; name: string; company: string | null; email: string | null; proposals: string; unpaid: string }>(
    `select c.id, c.name, c.company, c.email,
       (select count(*) from proposals p where p.client_id=c.id) as proposals,
       (select coalesce(sum(amount),0) from invoices i where i.client_id=c.id and i.status='unpaid') as unpaid
     from clients c where c.user_id=$1 order by c.name`, [user.id]);
  return (
    <main className="wrap page">
      <h1>Clients</h1>
      {rows.length === 0 ? (
        <div className="empty">No clients yet. Add one below, or tell Claude <code>Add Acme as a client</code>.</div>
      ) : (
        <table className="ledger">
          <thead><tr><th>Client</th><th>Contact</th><th>Proposals</th><th className="r">Unpaid</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link className="main" href={`/clients/${c.id}`}>{c.name}</Link>{c.company ? <><br /><span className="small muted">{c.company}</span></> : null}</td>
                <td className="muted">{c.email ?? "No email"}</td>
                <td className="mono">{c.proposals}</td>
                <td className="r mono">{Number(c.unpaid) ? inr(c.unpaid) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <section className="stack" style={{ maxWidth: 640 }}>
        <h2>Add a client</h2>
        <form action={createClient} className="stack" style={{ gap: 20 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="n">Name</label><input id="n" name="name" required /></div>
            <div className="field"><label htmlFor="c">Company</label><input id="c" name="company" /></div>
            <div className="field"><label htmlFor="e">Email</label><input id="e" name="email" type="email" /></div>
          </div>
          <div><button className="btn">Add client</button></div>
        </form>
      </section>
    </main>
  );
}
