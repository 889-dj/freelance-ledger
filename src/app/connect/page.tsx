import { headers } from "next/headers";
import { requireUser, getKey } from "@/lib/session";
import CopyButton from "@/components/CopyButton";
import { rotateKey } from "@/app/actions";

export const metadata = { title: "Connect Claude" };

export default async function Connect({ searchParams }: { searchParams: Promise<{ new?: string; rotated?: string }> }) {
  const q = await searchParams;
  await requireUser();
  const key = await getKey();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/mcp?key=${key}`;
  return (
    <main className="wrap page">
      <div className="stack"><p className="eyebrow">Connect Claude</p><h1>Give Claude the pen.</h1></div>
      {q.new || q.rotated ? (
        <div className="empty" style={{ borderColor: "var(--blue)", color: "var(--ink)" }} role="status">
          <strong>{q.rotated ? "Your key was replaced." : "Your workspace is ready."}</strong>{" "}
          Copy the link below into Claude now. We keep only a scrambled version of your key, so we can&rsquo;t show it again from another browser.
        </div>
      ) : null}
      <section className="stack" style={{ maxWidth: 720 }}>
        <p className="muted">This link carries your workspace key, so anyone who has it can read and write your ledger. Keep it to yourself.</p>
        <div className="codebox">{url}</div>
        <div><CopyButton text={url} label="Copy connector link" /></div>
      </section>
      <section className="stack" style={{ maxWidth: 720 }}>
        <h2>Replace your key</h2>
        <p className="muted">If the link leaked, make a new key. The old link stops working at once, so you will need to update the connector in Claude.</p>
        <form action={rotateKey}><button className="btn ghost sm">Replace my key</button></form>
      </section>
      <ol className="steps">
        <li><h3>Open connector settings</h3><p className="muted">In Claude, go to Settings, then Connectors, then Add custom connector.</p></li>
        <li><h3>Paste the link</h3><p className="muted">Name it Freelance Ledger and paste the link above as the URL. Leave sign-in fields empty.</p></li>
        <li><h3>Try it in a new chat</h3><p className="muted"><code className="say">Add Acme as a client, then draft a ₹80,000 proposal with two milestones.</code></p></li>
      </ol>
    </main>
  );
}
