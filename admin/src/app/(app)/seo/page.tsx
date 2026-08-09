"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { PageListItem } from "@/types";

export default function SeoListPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");

  const { data: pages } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => (await api.get<PageListItem[]>("/pages")).data,
  });

  const visible = (pages ?? []).filter(
    (p) =>
      !filter ||
      p.slug.toLowerCase().includes(filter.toLowerCase()) ||
      p.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <Header title={t("seo_title")} />
      <p className="mb-4 text-sm text-muted">{t("seo_subtitle")}</p>

      <input
        className="input mb-4 max-w-md"
        placeholder="/ru/uslugi/…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="card divide-y divide-line/60">
        {visible.map((page) => (
          <Link
            key={page.id}
            href={`/seo/${encodeURIComponent(page.slug.replace(/^\/|\/$/g, ""))}`}
            className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-brand-50/50"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{page.title}</div>
              <div className="font-mono text-xs text-brand-700">{page.slug}</div>
            </div>
            <span className="shrink-0 text-xs text-muted">
              {new Date(page.updated_at).toLocaleDateString("ru-RU")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
