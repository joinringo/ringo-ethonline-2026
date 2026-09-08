import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HoloBackdrop } from "@/components/visual/holo-backdrop";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ringo — settled markets, indexed",
  description:
    "Every prediction market Ringo has opened under a tweet, read from a subgraph on The Graph Network.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ground text-ink antialiased">
        {/* The backdrop is absolute inside this wrapper, so it stays the first
            child and everything after it carries a z-index. No overflow rule
            here: it would turn this into a scroll container and kill the
            header's `sticky`. The backdrop clips itself. */}
        <div className="relative">
          <HoloBackdrop />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
