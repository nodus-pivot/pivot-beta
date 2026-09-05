"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/service-center", label: "Service Center" },
  { href: "/ops", label: "Ops", adminOnly: true },
  { href: "/report", label: "Report" },
  { href: "/settings", label: "Settings" },
] as const;

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-[14px]">
      {LINKS.filter((l) => !("adminOnly" in l) || isAdmin).map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface hover:text-text"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
