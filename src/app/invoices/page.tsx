import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { inr, fmtDate, serial } from "@/lib/format";

export const metadata = { title: "Invoices" };

export default async function Invoices({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const user = await requireUser();
  const { s } = await searchParams;
  const filter = s === "paid" || s === "unpaid" ? s : null;
  const rows = await query<{ id: number; number: string; client: string; amount: string; due_date: string | null; status: string }>(
    `select i.id, i.number, c.name as client, i.amount, i.due_date::text as due_date, i.status
     from invoices i join clients c on c.id=i.client_id
     where i.user_id=$1 and ($2::text is null or i.status=$2) order by i.id desc`, [user.id, filter]);
  const tabs: [string, string | null][] = [["All", null], ["Unpaid", "unpaid"], ["Paid", "paid"]];
  return (
    <main className="wrap page">
      <h1>Invoices</h1>
      <div className="row" role="group" aria-label="Filter invoices">
        {tabs.map(([label, v]) => (
          <Link key={label} href={v ? `/invoices?s=${v}` : "/invoices"} className={`btn sm ${filter === v ? "" : "ghost"}`} aria-current={filter === v ? "true" : undefined}>{label}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty">{filter ? `No ${filter} invoices.` : <>No invoices yet. Ask Claude: <code>Invoice 50% of the first milestone for Acme</code>.</>}</div>
      ) : (
        <table className="ledger">
          <thead><tr><th>No.</th><th>Client</th><th>Due</th><th>Status</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td><Link className="main mono" style={{ color: "var(--red)" }} href={`/invoices/${i.id}`}>{serial(i.number)}</Link></td>
                <td>{i.client}</td>
                <td className="muted">{fmtDate(i.due_date)}</td>
                <td><span className={`tag ${i.status}`}>{i.status}</span></td>
                <td className="r mono">{inr(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
