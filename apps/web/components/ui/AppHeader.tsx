"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/auth-store";
import { Logo } from "./Logo";

export interface NavItem {
  href: string;
  label: string;
}

interface AppHeaderProps {
  subtitle?: string;
  nav?: NavItem[];
  homeHref?: string;
}

export function AppHeader({ subtitle, nav = [], homeHref = "/" }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-sand-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-3">
          <Logo size={34} />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold text-sand-900">
              Acompañamiento Comunitario
            </span>
            {subtitle && (
              <span className="text-xs text-sand-500">{subtitle}</span>
            )}
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-800"
                    : "text-sand-600 hover:bg-sand-100 hover:text-sand-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-900"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
