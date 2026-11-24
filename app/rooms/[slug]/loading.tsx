export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="decaya-specimen decaya-ruled border border-border bg-surface p-6">
        <span className="decaya-stamp text-muted-foreground">Setting up the bench</span>
        <p className="mt-4 font-display text-2xl">Laying out the decay curve and the furnishing list...</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]" aria-hidden>
        <div className="decaya-ruled min-h-[18rem] border border-border bg-surface" />
        <div className="decaya-ruled min-h-[18rem] border border-border bg-surface" />
      </div>
    </div>
  );
}
