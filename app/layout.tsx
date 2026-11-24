import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { getAdapter } from "@/lib/adapter";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
// Fixed weights: Google serves one static file per weight, which avoids the glyph gaps the
// variable file showed around "t" in the Phase 5 screenshots.
const sourceSans = Source_Sans_3({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
});

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

const HACKATHON_URL = "https://peninsula-innovation-hackathon.devpost.com/";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The first seeded room is the example bench the header links to (S5: every route reachable).
  const rooms = await getAdapter().listRooms();
  const benchHref = rooms[0] ? `/rooms/${rooms[0].slug}` : undefined;
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
              <BrandMark />
              Decaya
            </Link>
            <NavLinks benchHref={benchHref} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">{children}</main>
        <footer className="mt-12 border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-muted-foreground">Your audio stays in this browser tab.</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              <li>
                <a href="https://github.com/mericcintosun/decaya" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:decoration-2">
                  Source on GitHub
                </a>
              </li>
              <li>
                <a href={HACKATHON_URL} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:decoration-2">
                  Peninsula Innovation Hackathon
                </a>
              </li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
