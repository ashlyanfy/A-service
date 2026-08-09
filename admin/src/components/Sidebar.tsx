"use client";

import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  MousePointerClick,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";
import { DictionaryKey } from "@/lib/i18n/dictionaries";
import { UserRole } from "@/types";

interface NavItem {
  href: string;
  key: DictionaryKey;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { href: "/leads", key: "nav_leads", icon: Inbox },
  { href: "/events", key: "nav_events", icon: MousePointerClick },
  { href: "/content", key: "nav_content", icon: FileText, roles: ["ADMIN"] },
  { href: "/seo", key: "nav_seo", icon: Search, roles: ["ADMIN"] },
  { href: "/users", key: "nav_users", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", key: "nav_settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-brand-950 text-white max-lg:hidden">
      <div className="px-6 py-6">
        <div className="font-display text-lg font-extrabold tracking-tight">
          A-SERVICE
          <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            Админка
          </span>
        </div>
        <div className="mt-1 text-xs text-white/50">admin.a-service.asia</div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role))).map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-brand-700 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <LanguageSwitcher />
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-white/50">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title={t("nav_logout")}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={17} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white py-1.5 lg:hidden">
      {NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
        .slice(0, 5)
        .map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium ${
                active ? "text-brand-700" : "text-muted"
              }`}
            >
              <Icon size={19} />
              {t(item.key)}
            </Link>
          );
        })}
    </nav>
  );
}
