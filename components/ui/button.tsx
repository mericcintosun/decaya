import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Fieldbook controls: square corners, a 1px ink rule, no shadow. aria-pressed
// turns any outline button into an inked toggle (used by the furnishing cards).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-foreground bg-primary text-primary-foreground hover:bg-foreground",
        secondary: "border-foreground bg-secondary text-secondary-foreground hover:bg-muted",
        outline:
          "border-foreground bg-transparent text-foreground hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background",
        ghost: "border-transparent hover:border-border hover:bg-muted",
        destructive: "border-foreground bg-destructive text-destructive-foreground hover:bg-foreground",
        link: "border-transparent px-0 text-primary underline decoration-1 underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
