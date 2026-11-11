import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { pool, query } from "@/lib/db";
import { nextInvoiceNumber } from "@/lib/invoice-number";
import { keyFromRequest, userForKey, type User } from "@/lib/auth";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

function buildHandler(user: User, origin: string) {
  const uid = user.id;

  return createMcpHandler((server) => {
    server.registerTool(
      "create_client",
      {
        title: "Create client",
        description: "Add a new client to the freelancer's workspace.",
        inputSchema: z.object({
          name: z.string().min(1),
          email: z.string().optional(),
          company: z.string().optional(),
        }),
      },
      async ({ name, email, company }) => {
        const [c] = await query<{ id: number }>(
          "insert into clients (user_id, name, email, company) values ($1,$2,$3,$4) returning id",
          [uid, name, email ?? null, company ?? null],
        );
        return text(`Created client "${name}" (client_id ${c.id}). Open it: ${origin}/clients/${c.id}`);
      },
    );

    server.registerTool(
      "list_clients",
      {
        title: "List clients",
        description: "List all clients with their client_id values. Call this first to find a client_id.",
        inputSchema: z.object({}),
      },
      async () => {
        const rows = await query(
          "select id as client_id, name, email, company from clients where user_id = $1 order by id",
          [uid],
        );
        return text(JSON.stringify(rows, null, 2));
      },
    );

    server.registerTool(
      "create_proposal",
      {
        title: "Create proposal",
        description:
          "Create a draft proposal for a client with a scope description and payment milestones (amounts in INR).",
        inputSchema: z.object({
          client_id: z.number().int(),
          title: z.string().min(1),
          scope_text: z.string().optional(),
          milestones: z
            .array(z.object({ title: z.string().min(1), amount: z.number().nonnegative(), due_date: date.optional() }))
            .default([]),
        }),
      },
      async ({ client_id, title, scope_text, milestones }) => {
        const client = await query("select 1 from clients where id=$1 and user_id=$2", [client_id, uid]);
        if (!client.length) return fail(`No client with client_id ${client_id}. Use list_clients.`);
        const db = await pool.connect();
        try {
          await db.query("begin");
          const p = await db.query(
            "insert into proposals (user_id, client_id, title, scope_text) values ($1,$2,$3,$4) returning id",
            [uid, client_id, title, scope_text ?? ""],
          );
          const pid = p.rows[0].id as number;
          for (const [i, m] of milestones.entries()) {
            await db.query(
              "insert into milestones (proposal_id, title, amount, due_date, position) values ($1,$2,$3,$4,$5)",
              [pid, m.title, m.amount, m.due_date ?? null, i],
            );
          }
          await db.query("commit");
          const total = milestones.reduce((s, m) => s + m.amount, 0);
          return text(
            `Created proposal "${title}" (proposal_id ${pid}) with ${milestones.length} milestones, total Rs ${total}. Open it: ${origin}/proposals/${pid}`,
          );
        } catch (e) {
          await db.query("rollback");
          return fail((e as Error).message);
        } finally {
          db.release();
        }
      },
    );

    server.registerTool(
      "list_proposals",
      {
        title: "List proposals",
        description: "List proposals with their milestones (including milestone_id). Optionally filter by client_id.",
        inputSchema: z.object({ client_id: z.number().int().optional() }),
      },
      async ({ client_id }) => {
        const rows = await query(
          `select p.id as proposal_id, p.client_id, c.name as client, p.title, p.status, p.scope_text,
                  coalesce(json_agg(json_build_object('milestone_id', m.id, 'title', m.title,
                    'amount', m.amount, 'due_date', m.due_date) order by m.position)
                    filter (where m.id is not null), '[]') as milestones
           from proposals p join clients c on c.id = p.client_id
           left join milestones m on m.proposal_id = p.id
           where p.user_id = $1 and ($2::int is null or p.client_id = $2)
           group by p.id, c.name order by p.id`,
          [uid, client_id ?? null],
        );
        return text(JSON.stringify(rows, null, 2));
      },
    );

    server.registerTool(
      "update_proposal",
      {
        title: "Update proposal",
        description: "Change a proposal's title, scope text, or status (draft, sent, accepted).",
        inputSchema: z.object({
          proposal_id: z.number().int(),
          title: z.string().optional(),
          scope_text: z.string().optional(),
          status: z.enum(["draft", "sent", "accepted"]).optional(),
        }),
      },
      async ({ proposal_id, title, scope_text, status }) => {
        const rows = await query(
          `update proposals set title = coalesce($3, title), scope_text = coalesce($4, scope_text),
             status = coalesce($5, status) where id = $1 and user_id = $2 returning id, title, status`,
          [proposal_id, uid, title ?? null, scope_text ?? null, status ?? null],
        );
        if (!rows.length) return fail(`No proposal with proposal_id ${proposal_id}.`);
        return text(`Updated proposal ${proposal_id}. Open it: ${origin}/proposals/${proposal_id}`);
      },
    );

    server.registerTool(
      "create_invoice",
      {
        title: "Create invoice",
        description:
          "Create an invoice for a client. Give either amount, or milestone_id (full milestone amount, or percent of it). Amounts in INR.",
        inputSchema: z.object({
          client_id: z.number().int(),
          amount: z.number().positive().optional(),
          milestone_id: z.number().int().optional(),
          percent: z.number().positive().max(100).optional().describe("percent of the milestone amount"),
          due_date: date.optional(),
        }),
      },
      async ({ client_id, amount, milestone_id, percent, due_date }) => {
        const client = await query("select 1 from clients where id=$1 and user_id=$2", [client_id, uid]);
        if (!client.length) return fail(`No client with client_id ${client_id}. Use list_clients.`);
        let proposalId: number | null = null;
        let finalAmount = amount;
        if (milestone_id) {
          const [m] = await query<{ amount: string; proposal_id: number }>(
            `select m.amount, m.proposal_id from milestones m join proposals p on p.id = m.proposal_id
             where m.id = $1 and p.user_id = $2 and p.client_id = $3`,
            [milestone_id, uid, client_id],
          );
          if (!m) return fail(`Milestone ${milestone_id} not found for this client.`);
          proposalId = m.proposal_id;
          if (finalAmount === undefined) finalAmount = (Number(m.amount) * (percent ?? 100)) / 100;
        }
        if (finalAmount === undefined) return fail("Provide amount, or milestone_id (optionally with percent).");
        const number = await nextInvoiceNumber(uid);
        const [inv] = await query<{ id: number }>(
          `insert into invoices (user_id, client_id, proposal_id, milestone_id, number, amount, due_date)
           values ($1,$2,$3,$4,$5,$6,$7) returning id`,
          [uid, client_id, proposalId, milestone_id ?? null, number, finalAmount, due_date ?? null],
        );
        return text(`Created invoice ${number} (invoice_id ${inv.id}) for Rs ${finalAmount}. Open it: ${origin}/invoices/${inv.id}`);
      },
    );

    server.registerTool(
      "list_invoices",
      {
        title: "List invoices",
        description: "List invoices, optionally filtered by status (unpaid/paid) or client_id.",
        inputSchema: z.object({
          status: z.enum(["unpaid", "paid"]).optional(),
          client_id: z.number().int().optional(),
        }),
      },
      async ({ status, client_id }) => {
        const rows = await query(
          `select i.id as invoice_id, i.number, c.name as client, i.amount, i.due_date, i.status, i.paid_at
           from invoices i join clients c on c.id = i.client_id
           where i.user_id = $1 and ($2::text is null or i.status = $2) and ($3::int is null or i.client_id = $3)
           order by i.id`,
          [uid, status ?? null, client_id ?? null],
        );
        return text(JSON.stringify(rows, null, 2));
      },
    );

    server.registerTool(
      "mark_invoice_paid",
      {
        title: "Mark invoice paid",
        description: "Mark an invoice as paid (by invoice_id).",
        inputSchema: z.object({ invoice_id: z.number().int() }),
      },
      async ({ invoice_id }) => {
        const rows = await query<{ number: string }>(
          "update invoices set status='paid', paid_at=now() where id=$1 and user_id=$2 returning number",
          [invoice_id, uid],
        );
        if (!rows.length) return fail(`No invoice with invoice_id ${invoice_id}.`);
        return text(`Marked ${rows[0].number} as paid. Open it: ${origin}/invoices/${invoice_id}`);
      },
    );
  });
}

async function handle(req: Request): Promise<Response> {
  const user = await userForKey(keyFromRequest(req));
  if (!user) {
    return Response.json({ error: "Invalid or missing workspace key" }, { status: 401 });
  }
  return buildHandler(user, new URL(req.url).origin)(req);
}

export { handle as GET, handle as POST, handle as DELETE };
