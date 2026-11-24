import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="decaya-specimen decaya-ruled border border-border bg-surface p-8 text-center">
        <span className="decaya-stamp text-muted-foreground">Not in the fieldbook</span>
        <h1 className="mt-4 text-3xl font-semibold">Decaya has no page here</h1>
        <p className="mt-2 text-muted-foreground">The link may be old, or the room lives in someone else&apos;s browser.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Back to the fieldbook</Link>
        </Button>
      </div>
    </div>
  );
}
