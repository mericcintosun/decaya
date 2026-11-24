import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", variable: "--font-source-sans" });

const SITE_URL = "https://decaya.vercel.app";
const TITLE = "Decaya: hear your room fixed";
// Under 160 characters: the problem, then the fix.
const DESCRIPTION =
  "Your recording echoes because of the room, not the mic. Clap three times, see what a rug or curtain would change, and hear it first.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Decaya" },
  description: DESCRIPTION,
  // og:image comes from app/opengraph-image.tsx through the file convention.
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/", siteName: "Decaya" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
              <BrandMark />
              Decaya
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>Runs in your browser tab. No account, no upload, no server sees your audio.</p>
            <p>Built for the Peninsula Innovation Hackathon, 2026.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
