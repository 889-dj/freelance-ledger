"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { pool } from "@/lib/db";
import { userForKey, generateKey, hashKey } from "@/lib/auth";
import { COOKIE, requireUser } from "@/lib/session";
import { nextInvoiceNumber } from "@/lib/invoice-number";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optional = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string) => {
  const n = Number(str(f, k).replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
};

export async function login(_prev: { error?: string } | undefined, f: FormData) {
  const key = str(f, "key");
  const user = await userForKey(key);
  if (!user) return { error: "That key doesn't match any workspace. Check for extra spaces and try again." };
  setKeyCookie(await cookies(), key);

  redirect("/");
}

function setKeyCookie(c: Awaited<ReturnType<typeof cookies>>, key: string) {
  c.set(COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function signup(_prev: { error?: string } | undefined, f: FormData) {
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  if (!name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  const key = generateKey();
  try {
    await query("insert into users (name, email, key_hash) values ($1,$2,$3)", [name, email, hashKey(key)]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { error: "That email already has a workspace. Open it with its workspace key instead." };
    }
    throw e;
  }
  setKeyCookie(await cookies(), key);
  redirect("/connect?new=1");
}

export async function rotateKey() {
  const user = await requireUser();
  const key = generateKey();
  await query("update users set key_hash=$2 where id=$1", [user.id, hashKey(key)]);
  setKeyCookie(await cookies(), key);
  redirect("/connect?rotated=1");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/");
}

/* Clients */
export async function createClient(f: FormData) {
  const user = await requireUser();
  const name = str(f, "name");
  if (!name) return;
  const [c] = await query<{ id: number }>(
    "insert into clients (user_id, name, email, company) values ($1,$2,$3,$4) returning id",
    [user.id, name, optional(f, "email"), optional(f, "company")],
  );
  revalidatePath("/clients");
  redirect(`/clients/${c.id}`);
}

export async function saveClient(id: number, f: FormData) {
  const user = await requireUser();
  await query(
    "update clients set name=$3, email=$4, company=$5 where id=$1 and user_id=$2",
    [id, user.id, str(f, "name") || "Untitled client", optional(f, "email"), optional(f, "company")],
  );
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?saved=1`);
}

/* Proposals */
export async function createProposal(f: FormData) {
  const user = await requireUser();
  const clientId = Number(f.get("client_id"));
  const owned = await query("select 1 from clients where id=$1 and user_id=$2", [clientId, user.id]);
  if (!owned.length) return;
  const [p] = await query<{ id: number }>(
    "insert into proposals (user_id, client_id, title) values ($1,$2,$3) returning id",
    [user.id, clientId, str(f, "title") || "Untitled proposal"],
  );
  redirect(`/proposals/${p.id}`);
}

export async function saveProposal(id: number, f: FormData) {
  const user = await requireUser();
  const status = str(f, "status");
  const db = await pool.connect();
  try {
    await db.query("begin");
    const r = await db.query(
      `update proposals set title=$3, scope_text=$4, status=$5 where id=$1 and user_id=$2 returning id`,
      [id, user.id, str(f, "title") || "Untitled proposal", String(f.get("scope_text") ?? ""),
       ["draft", "sent", "accepted"].includes(status) ? status : "draft"],
    );
    if (!r.rowCount) throw new Error("not found");
    const ids = f.getAll("m_id").map(String);
    const titles = f.getAll("m_title").map(String);
    const amounts = f.getAll("m_amount").map((v) => Number(String(v).replaceAll(",", "")) || 0);
    const dues = f.getAll("m_due").map(String);
    const keep = ids.filter(Boolean).map(Number);
    await db.query("delete from milestones where proposal_id=$1 and not (id = any($2::int[]))", [id, keep]);
    for (let i = 0; i < titles.length; i++) {
      if (!titles[i].trim()) continue;
      const due = dues[i] || null;
      if (ids[i]) {
        await db.query(
          "update milestones set title=$3, amount=$4, due_date=$5, position=$6 where id=$1 and proposal_id=$2",
          [Number(ids[i]), id, titles[i].trim(), amounts[i], due, i],
        );
      } else {
        await db.query(
          "insert into milestones (proposal_id, title, amount, due_date, position) values ($1,$2,$3,$4,$5)",
          [id, titles[i].trim(), amounts[i], due, i],
        );
      }
    }
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    db.release();
  }
  revalidatePath(`/proposals/${id}`);
  redirect(`/proposals/${id}?saved=1`);
}

/* Invoices */
export async function createInvoice(f: FormData) {
  const user = await requireUser();
  const clientId = Number(f.get("client_id"));
  const owned = await query("select 1 from clients where id=$1 and user_id=$2", [clientId, user.id]);
  if (!owned.length) return;
  const number = await nextInvoiceNumber(user.id);
  const [inv] = await query<{ id: number }>(
    "insert into invoices (user_id, client_id, number, amount, due_date) values ($1,$2,$3,$4,$5) returning id",
    [user.id, clientId, number, num(f, "amount"), optional(f, "due_date")],
  );
  redirect(`/invoices/${inv.id}`);
}

export async function invoiceMilestone(f: FormData) {
  const user = await requireUser();
  const [m] = await query<{ amount: string; proposal_id: number; client_id: number; due_date: string | null }>(
    `select m.amount, m.proposal_id, p.client_id, m.due_date::text as due_date
     from milestones m join proposals p on p.id=m.proposal_id
     where m.id=$1 and p.user_id=$2`,
    [Number(f.get("milestone_id")), user.id],
  );
  if (!m) return;
  const number = await nextInvoiceNumber(user.id);
  const [inv] = await query<{ id: number }>(
    `insert into invoices (user_id, client_id, proposal_id, milestone_id, number, amount, due_date)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [user.id, m.client_id, m.proposal_id, Number(f.get("milestone_id")), number, m.amount, m.due_date],
  );
  redirect(`/invoices/${inv.id}`);
}

export async function saveInvoice(id: number, f: FormData) {
  const user = await requireUser();
  await query(
    "update invoices set amount=$3, due_date=$4 where id=$1 and user_id=$2",
    [id, user.id, num(f, "amount"), optional(f, "due_date")],
  );
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?saved=1`);
}

export async function setPaid(id: number, paid: boolean) {
  const user = await requireUser();
  await query(
    "update invoices set status=$3, paid_at=$4 where id=$1 and user_id=$2",
    [id, user.id, paid ? "paid" : "unpaid", paid ? new Date() : null],
  );
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${id}${paid ? "?stamped=1" : ""}`);
}
