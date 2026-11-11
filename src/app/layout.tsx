import type { Metadata } from "next";
import { Schibsted_Grotesk, Martian_Mono, Special_Elite } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const ui = Schibsted_Grotesk({ subsets: ["latin"], variable: "--f-ui", display: "swap" });
const mono = Martian_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });
const stamp = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--f-stamp", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Freelance Ledger", template: "%s · Freelance Ledger" },
  description: "Clients, proposals and invoices for freelancers. Tell Claude what happened; it's filed here, ready to edit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable} ${stamp.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
