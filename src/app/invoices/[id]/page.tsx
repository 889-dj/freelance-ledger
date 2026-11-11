import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { saveInvoice, setPaid } from "@/app/actions";
import { fmtDate, serial } from "@/lib/format";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; stamped?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { saved, stamped } = await searchParams;
  const iid = Number(id);
  if (!Number.isInteger(iid)) notFound();
  const [inv] = await query<{ id: number; number: string; amount: string; due_date: string | null; status: string; paid_at: Date | null; client_id: number; client: string; company: string | null; proposal_id: number | null; proposal: string | null; milestone: string | null }>(
    `select i.id, i.number, i.amount, i.due_date::text as due_date, i.status, i.paid_at, i.client_id, c.name as client, c.company,
       i.proposal_id, p.title as proposal, m.title as milestone
     from invoices i join clients c on c.id=i.client_id
     left join proposals p on p.id=i.proposal_id left join milestones m on m.id=i.milestone_id
     where i.id=$1 and i.user_id=$2`, [iid, user.id]);
  if (!inv) notFound();
  const paid = inv.status === "paid";
  return (
    <main className="wrap page">
      <p className="eyebrow"><Link href="/invoices">Invoices</Link> · <Link href={`/clients/${inv.client_id}`}>{inv.client}</Link></p>
      <div className="leaf" style={{ maxWidth: 760 }}>
        <div className="leaf-head">
          <div>
            <p className="eyebrow">Invoice</p>
            <p style={{ fontWeight: 800, fontSize: "1.5rem", marginTop: 8 }}>{inv.client}</p>
            {inv.company ? <p className="muted">{inv.company}</p> : null}
          </div>
          <p className="serial"><small>No.</small>{serial(inv.number)}</p>
        </div>

        {(inv.proposal || inv.milestone) && (
          <p className="muted" style={{ marginBottom: 20 }}>
            For {inv.milestone ? <strong>{inv.milestone}</strong> : null}
            {inv.proposal ? <> on <Link href={`/proposals/${inv.proposal_id}`}>{inv.proposal}</Link></> : null}
          </p>
        )}

        <form action={saveInvoice.bind(null, inv.id)} className="stack" style={{ gap: 20 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="a">Amount (₹)</label><input id="a" name="amount" className="num" inputMode="decimal" defaultValue={Number(inv.amount)} required /></div>
            <div className="field"><label htmlFor="d">Due</label><input id="d" name="due_date" type="date" defaultValue={inv.due_date ?? ""} /></div>
          </div>
          <div className="row"><button className="btn ghost sm">Save changes</button>{saved ? <span className="note">Saved</span> : null}</div>
        </form>

        <div className="row between" style={{ marginTop: 32, paddingTop: 20, borderTop: "2px solid var(--ink)" }}>
          <div>
            <span className={`tag ${inv.status}`}>{inv.status}</span>
            <p className="small muted" style={{ marginTop: 8 }}>
              {paid && inv.paid_at ? `Paid on ${fmtDate(inv.paid_at)}` : `Due ${fmtDate(inv.due_date)}`}
            </p>
          </div>
          {paid ? <span className={`stamp ${stamped ? "thump" : ""}`}>Paid</span> : null}
        </div>
        <div style={{ marginTop: 20 }}>
          {paid ? (
            <form action={setPaid.bind(null, inv.id, false)}><button className="linklike small">Undo: mark as unpaid</button></form>
          ) : (
            <form action={setPaid.bind(null, inv.id, true)}><button className="btn">Mark as paid</button></form>
          )}
        </div>
      </div>
    </main>
  );
}
