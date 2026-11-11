import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userForKey } from "@/lib/auth";

export const COOKIE = "ledger_key";

export const getKey = cache(async () => (await cookies()).get(COOKIE)?.value ?? null);

export const getUser = cache(async () => userForKey(await getKey()));

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/");
  return user;
}
