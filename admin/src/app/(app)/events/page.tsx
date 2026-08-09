"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { DictionaryKey } from "@/lib/i18n/dictionaries";
import { SiteEventListResponse, SiteEventType } from "@/types";

const TYPE_KEYS: Record<SiteEventType, DictionaryKey> = {
  PAGE_VIEW: "event_page_view",
  WHATSAPP: "event_whatsapp",
  CALL: "event_call",
  QUOTE_OPEN: "event_quote_open",
  LEAD_SUBMIT: "event_lead_submit",
};

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export default function EventsPage() {
  const { t } = useI18n();
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [type, setType] = useState<SiteEventType | "">("");
  const [pageName, setPageName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data } = useQuery({
    queryKey: ["events", "list", dateFrom, dateTo, type, pageName, page],
    queryFn: async () =>
      (
        await api.get<SiteEventListResponse>("/events", {
          params: {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            ...(type ? { event_type: type } : {}),
            ...(pageName ? { page_name: pageName } : {}),
            page,
            page_size: pageSize,
          },
        })
      ).data,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div>
      <Header title={t("events_title")} />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col text-xs text-muted">
          {t("monitoring_date_from")}
          <input type="date" className="input w-auto" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="flex flex-col text-xs text-muted">
          {t("monitoring_date_to")}
          <input type="date" className="input w-auto" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </label>
        <select className="input w-auto" value={type} onChange={(e) => { setType(e.target.value as SiteEventType | ""); setPage(1); }}>
          <option value="">{t("events_all_types")}</option>
          {Object.entries(TYPE_KEYS).map(([value, key]) => (
            <option key={value} value={value}>
              {t(key)}
            </option>
          ))}
        </select>
        <input
          className="input max-w-xs"
          placeholder={t("events_page_filter")}
          value={pageName}
          onChange={(e) => { setPageName(e.target.value); setPage(1); }}
        />
        <span className="ml-auto text-sm text-muted">{data ? `${data.total}` : "—"}</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3">{t("events_table_time")}</th>
              <th className="px-4 py-3">{t("events_table_type")}</th>
              <th className="px-4 py-3">{t("events_table_page")}</th>
              <th className="px-4 py-3">{t("events_table_visitor")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  {t("not_found")}
                </td>
              </tr>
            )}
            {data?.items.map((event) => (
              <tr key={event.id} className="border-b border-line/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-muted">
                  {new Date(event.created_at).toLocaleString("ru-RU")}
                </td>
                <td className="px-4 py-2 font-medium">{t(TYPE_KEYS[event.event_type])}</td>
                <td className="max-w-[320px] truncate px-4 py-2">{event.page ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{event.visitor_id.slice(0, 12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" className="chip" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← {t("leads_prev")}
          </button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <button type="button" className="chip" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t("leads_next")} →
          </button>
        </div>
      )}
    </div>
  );
}
