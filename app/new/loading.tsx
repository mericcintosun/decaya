export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="decaya-specimen decaya-ruled max-w-[68ch] border border-border bg-surface p-6">
        <span className="decaya-stamp text-muted-foreground">Fresh specimen tag</span>
        <p className="mt-4 font-display text-2xl">Getting the measuring page ready...</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]" aria-hidden>
        <div className="decaya-ruled min-h-[16rem] border border-border bg-surface" />
        <div className="decaya-ruled min-h-[16rem] border border-border bg-surface" />
      </div>
    </div>
  );
}
