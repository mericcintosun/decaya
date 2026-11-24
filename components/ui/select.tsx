import * as React from "react";
import { cn } from "@/lib/utils";

// Native select in the same fieldbook form as Input (keeps mobile pickers native).
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-[2px] border border-input border-b-foreground bg-background px-3 py-1 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
