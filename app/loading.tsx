export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 lg:grid-cols-12">
      <div className="decaya-specimen decaya-ruled min-h-[16rem] border border-border bg-surface p-6 lg:col-span-7">
        <span className="decaya-stamp text-muted-foreground">Opening the fieldbook</span>
        <p className="mt-4 font-display text-2xl">Fetching the rooms...</p>
      </div>
      <div className="decaya-ruled min-h-[10rem] border border-border bg-deep lg:col-span-5" aria-hidden />
      <div className="decaya-ruled min-h-[8rem] border border-border bg-surface lg:col-span-4" aria-hidden />
      <div className="decaya-ruled min-h-[8rem] border border-border bg-surface lg:col-span-8" aria-hidden />
    </div>
  );
}
