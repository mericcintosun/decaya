import * as React from "react";
import { cn } from "@/lib/utils";

// A fieldbook page: sharp corners, a 1px rule, no shadow. Add `decaya-specimen`
// for the punched tag hole and `decaya-ruled` for notebook lines.
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[2px] border border-border bg-card text-card-foreground", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 border-b border-border p-5", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-display text-lg font-semibold leading-tight", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 border-t border-border p-5", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
