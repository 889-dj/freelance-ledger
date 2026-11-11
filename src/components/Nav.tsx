"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/", "Overview"],
  ["/clients", "Clients"],
  ["/proposals", "Proposals"],
  ["/invoices", "Invoices"],
  ["/connect", "Connect Claude"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map(([href, label]) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}>{label}</Link>
        );
      })}
    </nav>
  );
}
