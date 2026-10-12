"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ActiveNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/resources"
      ? pathname.startsWith("/resources")
      : pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded px-2 py-1 hover:underline ${
        active ? "bg-muted font-semibold text-foreground" : ""
      }`}
    >
      {children}
    </Link>
  );
}
