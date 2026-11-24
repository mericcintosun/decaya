"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shows no error message or stack on purpose: the visitor gets a retry and a way home.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="decaya-specimen decaya-ruled border border-border bg-surface p-8 text-center">
        <span className="decaya-stamp text-bad">Page torn</span>
        <h1 className="mt-4 text-3xl font-semibold">Decaya hit a snag on this page</h1>
        <p className="mt-2 text-muted-foreground">Your rooms in this browser are safe. Try again, or go back to the fieldbook.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the fieldbook</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
