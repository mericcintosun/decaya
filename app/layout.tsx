import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", variable: "--font-source-sans" });

export const metadata: Metadata = {
  title: { default: "Decaya: clap once, hear your room fixed", template: "%s | Decaya" },
  description:
    "Clap once in your room. Decaya measures how long the echo rings, works out which rug or curtain would fix it, and plays you the result before you buy anything.",
};

const NAV = [
  { href: "/", label: "Rooms" },
  { href: "/new", label: "Measure a room" },
  { href: "/about", label: "Method" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
              <BrandMark />
              Decaya
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              {NAV.map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>
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
