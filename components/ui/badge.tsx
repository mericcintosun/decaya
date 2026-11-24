import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Specimen labels: square, uppercase, letter-spaced. `stamp` is the rotated
// double-ruled field stamp used for verdicts and clap quality.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-foreground bg-primary text-primary-foreground",
        secondary: "border-foreground bg-secondary text-secondary-foreground",
        outline: "border-foreground bg-background text-foreground",
        ok: "border-ok bg-background text-ok",
        warn: "border-warn bg-background text-foreground",
        bad: "border-bad bg-background text-bad",
        destructive: "border-foreground bg-destructive text-destructive-foreground",
        stamp: "decaya-stamp border-0 bg-transparent px-2 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
