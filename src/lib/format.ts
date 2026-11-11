const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const inr = (n: number | string | null | undefined) =>
  "₹" + inrFmt.format(Number(n ?? 0));

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "No date";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const serial = (n: string | number) => String(n).replace(/^INV-/, "");
