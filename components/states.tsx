"use client";

// Loading, error and empty states for every demo route, in the fieldbook vocabulary:
// ruled blocks, specimen tags, stamps, 1px ink rules. Skeletons are static (no spinner,
// no pulse); the only entrance is decaya-drop through the decaya-drop-in wrapper.
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Home: a bento of ruled blocks while the fieldbook loads. */
export function SpecimenSkeleton({
  stamp = "Opening the fieldbook",
  line = "Fetching the rooms...",
}: {
  stamp?: string;
  line?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 lg:grid-cols-12">
      <div className="decaya-specimen decaya-ruled min-h-[16rem] border border-border bg-surface p-6 lg:col-span-7">
        <span className="decaya-stamp text-muted-foreground">{stamp}</span>
        <p className="mt-4 font-display text-2xl">{line}</p>
      </div>
      <div className="decaya-ruled min-h-[10rem] border border-border bg-deep lg:col-span-5" aria-hidden />
      <div className="decaya-ruled min-h-[8rem] border border-border bg-surface lg:col-span-4" aria-hidden />
      <div className="decaya-ruled min-h-[8rem] border border-border bg-surface lg:col-span-8" aria-hidden />
    </div>
  );
}

/** Room bench: header tag plus the two working cards, ruled and empty. */
export function BenchSkeleton({
  stamp = "Setting up the bench",
  line = "Laying out the decay curve and the furnishing list...",
}: {
  stamp?: string;
  line?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="decaya-specimen decaya-ruled border border-border bg-surface p-6">
        <span className="decaya-stamp text-muted-foreground">{stamp}</span>
        <p className="mt-4 font-display text-2xl">{line}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]" aria-hidden>
        <div className="decaya-ruled min-h-[18rem] border border-border bg-surface" />
        <div className="decaya-ruled min-h-[18rem] border border-border bg-surface" />
      </div>
    </div>
  );
}

/** Measuring page: the label card and the clap card, ruled and empty. */
export function FormSkeleton({
  stamp = "Fresh specimen tag",
  line = "Getting the measuring page ready...",
}: {
  stamp?: string;
  line?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="decaya-specimen decaya-ruled max-w-[68ch] border border-border bg-surface p-6">
        <span className="decaya-stamp text-muted-foreground">{stamp}</span>
        <p className="mt-4 font-display text-2xl">{line}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]" aria-hidden>
        <div className="decaya-ruled min-h-[16rem] border border-border bg-surface" />
        <div className="decaya-ruled min-h-[16rem] border border-border bg-surface" />
      </div>
    </div>
  );
}

/** A retry and a way home. Never prints raw error text. */
export function ErrorState({
  title,
  hint,
  onRetry,
  homeHref = "/",
  stamp = "Page torn",
}: {
  title: string;
  hint: string;
  onRetry: () => void;
  homeHref?: string;
  stamp?: string;
}) {
  return (
    <div className="decaya-drop-in mx-auto max-w-xl py-16">
      <div className="decaya-specimen decaya-ruled border border-border bg-surface p-8 text-center" role="alert">
        <span className="decaya-stamp text-bad">{stamp}</span>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{hint}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onRetry}>
            <RotateCcw aria-hidden /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href={homeHref}>Back to the fieldbook</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A specimen tag with a stamp, one line, one sentence and one call to action. */
export function EmptyState({
  stamp,
  title,
  body,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  className = "",
  as = "p",
}: {
  stamp: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
  /** "h1" when the empty state is the whole page body. */
  as?: "p" | "h1";
}) {
  const Title = as;
  return (
    <div className={`decaya-specimen decaya-ruled border border-border bg-surface p-8 ${className}`}>
      <span className="decaya-stamp text-muted-foreground">{stamp}</span>
      <Title className={as === "h1" ? "mt-3 text-3xl font-semibold" : "mt-3 font-display text-xl"}>{title}</Title>
      <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        {secondaryHref && secondaryLabel && (
          <Button asChild variant="ghost">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
