import { query } from "@/lib/db";

export async function nextInvoiceNumber(userId: number) {
  const [{ n }] = await query<{ n: string }>(
    "select coalesce(max(substring(number from 5)::int),0)+1 as n from invoices where user_id=$1",
    [userId],
  );
  return `INV-${String(n).padStart(4, "0")}`;
}
