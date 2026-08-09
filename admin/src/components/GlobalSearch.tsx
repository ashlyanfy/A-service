"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { SearchResults } from "@/types";

export function GlobalSearch() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => (await api.get<SearchResults>("/search", { params: { q: query } })).data,
    enabled: query.trim().length >= 2,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = data && (data.leads.length > 0 || data.pages.length > 0);

  return (
    <div ref={boxRef} className="relative w-64 max-md:w-44">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        className="input pl-9"
        placeholder={t("search_placeholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-xl">
          {!hasResults && <div className="px-3 py-4 text-sm text-muted">{t("not_found")}</div>}
          {data?.leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 hover:bg-brand-50"
            >
              <div className="text-sm font-medium text-ink">{lead.name}</div>
              <div className="text-xs text-muted">{lead.phone}</div>
            </Link>
          ))}
          {data?.pages.map((page) => (
            <Link
              key={`${page.slug}-${page.block_id}`}
              href={`/content/${encodeURIComponent(page.slug.replace(/^\/|\/$/g, ""))}`}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 hover:bg-brand-50"
            >
              <div className="text-sm font-medium text-ink">{page.title}</div>
              <div className="truncate text-xs text-muted">{page.snippet}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
