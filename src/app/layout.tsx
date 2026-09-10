import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
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

// ringo-marketing's secondary face. There it is the whole --font-mono; here it
// takes the label register — the uppercase micro-labels — while JetBrains stays
// on hashes and figures, which it is drawn for.
const supplyMono = localFont({
  src: "../../public/fonts/PPSupplyMono-Regular.otf",
  weight: "400",
  style: "normal",
  variable: "--font-supply-mono",
  display: "swap",
});

// The wordmark's face, same file and same declaration as ringo-marketing.
// Single face, declared at 800 so `.font-display` matches without synthesising.
const monument = localFont({
  src: "../../public/fonts/MonumentExtended-Ultrabold.otf",
  weight: "800",
  style: "normal",
  variable: "--font-monument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ringo — settled markets, indexed",
  // Never "prediction market" here. This is the line a crawler indexes as the
  // product category, and Ringo's public brand is a social challenge platform —
  // see the branding doctrine in the webapp repo. "Market" stays the internal
  // noun for an order-book position, which is what the table below shows.
  description:
    "Every challenge Ringo has settled under a tweet, read from a subgraph indexed with The Graph.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} ${supplyMono.variable} ${monument.variable}`}
    >
      {/* No background on body: the atmosphere canvas paints at -z-10, which
          sits behind body's own background box. The floor is on <html>. */}
      <body className="min-h-screen text-ink antialiased">
        {/* Motion renders its hidden state during SSR. Without this the reveals
            would leave a server-rendered page blank when JavaScript is off. */}
        <noscript>
          <style>
            {`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}
          </style>
        </noscript>

        <SmoothScroll>
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
        </SmoothScroll>
      </body>
    </html>
  );
}
