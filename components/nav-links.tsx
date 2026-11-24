"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  { href: "/", label: "Rooms" },
  { href: "/new", label: "Measure a room" },
  { href: "/about", label: "Method" },
];

const PANEL_ID = "main-menu-panel";

/** The bench link is active on any room page; Rooms only on the collection. */
function isActive(href: string, pathname: string): boolean {
  if (href.startsWith("/rooms/")) return pathname.startsWith("/rooms/");
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Header links. From md up they sit inline; below md a "Menu" disclosure opens a
 * full-width panel with the same three links. The active route gets
 * aria-current="page" and an ink underline on a DEEP fill in both places.
 */
export function NavLinks({ benchHref }: { benchHref?: string }) {
  const pathname = usePathname() ?? "/";
  // The four S5 routes: collection, detail (an example bench), create, method.
  const NAV = benchHref
    ? [BASE_NAV[0], { href: benchHref, label: "Example bench" }, BASE_NAV[1], BASE_NAV[2]]
    : BASE_NAV;
  const [open, setOpen] = useState(false);

  // The panel closes on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn("min-h-11", active && "bg-deep underline decoration-2 underline-offset-4")}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>

      <Button
        variant="outline"
        className="min-h-11 md:hidden"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
        Menu
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="panel"
            id={PANEL_ID}
            aria-label="Main"
            className="w-full basis-full border-t border-border pt-2 md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            <ul className="flex flex-col gap-1 pb-2">
              {NAV.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center border border-transparent px-3 font-semibold hover:border-border hover:bg-muted",
                        active && "bg-deep underline decoration-2 underline-offset-4",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
