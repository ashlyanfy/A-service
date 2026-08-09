"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { PageListItem } from "@/types";

export default function ContentPage() {
  const { t } = useI18n();

  const { data: pages } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => (await api.get<PageListItem[]>("/pages")).data,
  });

  // Показываем сначала страницы с блоками (главные), затем остальные по алфавиту
  const editable = (pages ?? []).filter((p) => p.slug === "/ru/" || p.slug === "/kk/");
  const rest = (pages ?? []).filter((p) => p.slug !== "/ru/" && p.slug !== "/kk/");

  return (
    <div>
      <Header title={t("content_title")} />
      <p className="mb-5 text-sm text-muted">{t("content_subtitle")}</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...editable, ...rest].map((page) => (
          <Link
            key={page.id}
            href={`/content/${encodeURIComponent(page.slug.replace(/^\/|\/$/g, ""))}`}
            className="card block p-4 transition hover:border-brand-300"
          >
            <div className="truncate font-medium text-ink">{page.title}</div>
            <div className="mt-1 font-mono text-xs text-brand-700">{page.slug}</div>
            <div className="mt-2 text-xs text-muted">
              {t("content_updated")}: {new Date(page.updated_at).toLocaleString("ru-RU")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
