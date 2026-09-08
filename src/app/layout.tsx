import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Atmosphere } from "@/components/visual/atmosphere/atmosphere";
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
      {/* No background on body: the atmosphere canvas paints at -z-10, which
          sits behind body's own background box. The floor is on <html>. */}
      <body className="min-h-screen text-ink antialiased">
        {/* z-index stays `auto` here: the rake blends with color-dodge and
            needs the atmosphere canvas in the same stacking context. */}
        <div className="relative">
          <Atmosphere />

          {/* The backdrop is the hero's, so it is bounded to the hero band
              rather than the whole document. Still no z-index. */}
          <div className="absolute inset-x-0 top-0 h-[820px]">
            <HoloBackdrop />
          </div>

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
