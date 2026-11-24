"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Rooms" },
  { href: "/new", label: "Measure a room" },
  { href: "/about", label: "Method" },
];

/** Header links. The active route gets aria-current="page" and an ink underline on a DEEP fill. */
export function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
      {NAV.map((item) => {
        // Room detail pages belong to the Rooms collection.
        const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/rooms/") : pathname.startsWith(item.href);
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            size="sm"
            className={cn(active && "bg-deep underline decoration-2 underline-offset-4")}
          >
            <Link href={item.href} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
