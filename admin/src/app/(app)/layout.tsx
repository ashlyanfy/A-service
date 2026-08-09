"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MobileNav, Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted">{t("loading")}</div>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-x-hidden px-6 py-8 pb-24 lg:px-10 lg:pb-8">{children}</main>
      <MobileNav />
    </div>
  );
}
