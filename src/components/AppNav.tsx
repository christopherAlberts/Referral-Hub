"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";
import { PushCoach } from "@/components/PushCoach";

const linksByRole: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Users" },
    { href: "/admin/settings", label: "Settings" },
  ],
  PSYCHIATRIST: [
    { href: "/psychiatrist", label: "Board" },
    { href: "/psychiatrist/profile", label: "Profile" },
  ],
  THERAPIST: [
    { href: "/therapist", label: "Today" },
    { href: "/therapist/profile", label: "Profile" },
  ],
};

export function AppNav({ title }: { title: string }) {
  const { data } = useSession();
  const pathname = usePathname();
  const role = data?.user?.role ?? "";
  const links = linksByRole[role] ?? [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(232,238,245,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 shrink-0 text-[var(--ink)]" />
            <div>
              <p
                className="text-[1.35rem] leading-none tracking-tight text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Referral Hub
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {data?.user?.name}
            </span>
            <button className="btn btn-secondary !px-3 !py-2 text-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </div>
        </div>
        {links.length > 1 && (
          <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="chip"
                  data-active={active ? "true" : "false"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <PushCoach />
    </>
  );
}
