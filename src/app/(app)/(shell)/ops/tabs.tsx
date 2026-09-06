"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OpsTabs({ tabs }: { tabs: { href: string; label: string; body: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`) || (t.href === "/ops/supply" && pathname.startsWith("/ops/parts/"));
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 transition-colors ${active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-[color-mix(in_srgb,var(--pivot-text)_5%,transparent)] hover:text-text"}`}
          >
            <span className="block text-[14px] font-medium">{t.label}</span>
            <span className="block text-[12.5px] text-text-3">{t.body}</span>
          </Link>
        );
      })}
    </nav>
  );
}
