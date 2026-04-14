"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/schedule", label: "Cuadrante" },
  { href: "/employees", label: "Trabajadores" },
  { href: "/locations", label: "Porterías" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workerMode = pathname.startsWith("/worker/");

  if (workerMode) {
    return <div className="app-frame worker-mode">{children}</div>;
  }

  return (
    <div className="app-frame">
      <header className="topbar no-print">
        <Link className="brand brand-inline" href="/schedule">
          <span className="brand-mark">CL</span>
          <strong>Cuadrante</strong>
        </Link>

        <nav className="nav nav-inline">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} className={active ? "nav-link active" : "nav-link"} href={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="content content-topbar">{children}</main>
    </div>
  );
}
