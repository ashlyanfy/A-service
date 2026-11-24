"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { categoryLabel, requestKind } from "@/lib/lead-labels";
import { DictionaryKey } from "@/lib/i18n/dictionaries";
import {
  LeadDailyResponse,
  LeadListResponse,
  LeadStats,
  LeadStatus,
  PageBreakdownResponse,
  SalesDailyResponse,
  SiteEventListResponse,
  SiteEventStats,
  SiteEventType,
  VisitsDailyResponse,
} from "@/types";

const PERIODS = [7, 30, 90] as const;

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

function shiftISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

const ACTION_KEY: Record<SiteEventType, DictionaryKey> = {
  PAGE_VIEW: "event_page_view",
  WHATSAPP: "event_whatsapp",
  CALL: "event_call",
  QUOTE_OPEN: "event_quote_open",
  LEAD_SUBMIT: "event_lead_submit",
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [days, setDays] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");

  // Период мониторинга — по умолчанию сегодня.
  const [dateFrom, setDateFrom] = useState<string>(todayISO());
  const [dateTo, setDateTo] = useState<string>(todayISO());

  const periodParams = { date_from: dateFrom || undefined, date_to: dateTo || undefined };

  const { data: eventStats } = useQuery({
    queryKey: ["events", "stats", dateFrom, dateTo],
    queryFn: async () => (await api.get<SiteEventStats>("/events/stats", { params: periodParams })).data,
  });

  const { data: visitsDaily } = useQuery({
    queryKey: ["events", "visits-daily", days],
    queryFn: async () => (await api.get<VisitsDailyResponse>("/events/visits-daily", { params: { days } })).data,
  });

  const { data: salesDaily } = useQuery({
    queryKey: ["leads", "sales-daily", dateFrom, dateTo],
    queryFn: async () => (await api.get<SalesDailyResponse>("/leads/sales-daily", { params: periodParams })).data,
  });

  const { data: byPage } = useQuery({
    queryKey: ["events", "by-page", dateFrom, dateTo],
    queryFn: async () => (await api.get<PageBreakdownResponse>("/events/by-page", { params: periodParams })).data,
  });

  const { data: recentEvents } = useQuery({
    queryKey: ["events", "recent", dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get<SiteEventListResponse>("/events", {
          params: { ...periodParams, page: 1, page_size: 10 },
        })
      ).data,
  });

  const { data: stats } = useQuery({
    queryKey: ["leads", "stats"],
    queryFn: async () => (await api.get<LeadStats>("/leads/stats")).data,
  });

  const { data: daily } = useQuery({
    queryKey: ["leads", "daily", days, statusFilter],
    queryFn: async () =>
      (
        await api.get<LeadDailyResponse>("/leads/daily", {
          params: { days, ...(statusFilter ? { status: statusFilter } : {}) },
        })
      ).data,
  });

  const { data: recent } = useQuery({
    queryKey: ["leads", "recent"],
    refetchInterval: 30_000,
    queryFn: async () => (await api.get<LeadListResponse>("/leads", { params: { page: 1, page_size: 8 } })).data,
  });

  const monitoringCards: { label: string; value: number | undefined; key: string }[] = [
    { label: t("monitoring_views"), value: eventStats?.page_view, key: "views" },
    { label: t("monitoring_unique"), value: eventStats?.unique_visitors, key: "uniq" },
    { label: t("monitoring_whatsapp"), value: eventStats?.whatsapp, key: "wa" },
    { label: t("monitoring_call"), value: eventStats?.call, key: "call" },
    { label: t("monitoring_quote_open"), value: eventStats?.quote_open, key: "quote" },
    { label: t("monitoring_lead_submit"), value: eventStats?.lead_submit, key: "submit" },
  ];

  const statusCards: { label: string; value: number | undefined; key: string }[] = [
    { label: t("dashboard_new"), value: stats?.new, key: "new" },
    { label: t("dashboard_qualified"), value: stats?.qualified, key: "qualified" },
    { label: t("dashboard_proposal"), value: stats?.proposal, key: "proposal" },
    { label: t("dashboard_in_progress"), value: stats?.in_progress, key: "in_progress" },
    { label: t("dashboard_won"), value: stats?.won, key: "won" },
    { label: t("dashboard_done"), value: stats?.done, key: "done" },
    { label: t("dashboard_cancelled"), value: stats?.cancelled, key: "cancelled" },
    { label: t("dashboard_declined"), value: stats?.declined, key: "declined" },
  ];

  const visitsChart = (visitsDaily?.points ?? []).map((p) => ({
    date: new Date(p.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    views: p.views,
    visitors: p.visitors,
  }));

  const leadsChart = (daily?.points ?? []).map((p) => ({
    date: new Date(p.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    count: p.count,
  }));

  const periodButtons = [
    { label: t("monitoring_today"), from: todayISO(), to: todayISO() },
    { label: t("monitoring_yesterday"), from: shiftISO(-1), to: shiftISO(-1) },
    { label: t("monitoring_last_7"), from: shiftISO(-6), to: todayISO() },
    { label: t("monitoring_last_30"), from: shiftISO(-29), to: todayISO() },
  ];

  return (
    <div>
      <Header title={t("dashboard_title")} />

      {/* ── Мониторинг: посещаемость + действия + продажи за период ── */}
      <section className="card mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">{t("monitoring_title")}</h2>
            <p className="text-sm text-muted">{t("monitoring_subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-muted">
              {t("monitoring_date_from")}
              <input type="date" className="input w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="flex flex-col text-xs text-muted">
              {t("monitoring_date_to")}
              <input type="date" className="input w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <div className="flex gap-1">
              {periodButtons.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setDateFrom(btn.from);
                    setDateTo(btn.to);
                  }}
                  className={`chip ${dateFrom === btn.from && dateTo === btn.to ? "chip-active" : ""}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {monitoringCards.map((card) => (
            <div key={card.key} className="rounded-2xl bg-brand-50 p-4">
              <div className="text-xs text-muted">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-brand-800">{card.value ?? "—"}</div>
            </div>
          ))}
        </div>

        {/* Сумма сделок + сделки по дням */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line p-4">
            <div className="text-sm text-muted">{t("monitoring_sales_total")}</div>
            <div className="mt-2 text-3xl font-bold text-brand-700">
              {salesDaily ? `${salesDaily.total.toLocaleString("ru-RU")} ₸` : "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-line p-4 lg:col-span-2">
            <div className="mb-2 text-sm font-medium">{t("monitoring_sales_by_day")}</div>
            {salesDaily && salesDaily.points.length > 0 ? (
              <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {salesDaily.points.map((p) => (
                  <div key={p.date} className="flex items-center justify-between border-b border-line/50 py-1 last:border-0">
                    <span className="text-muted">{new Date(p.date).toLocaleDateString("ru-RU")}</span>
                    <span>
                      <span className="font-semibold">{p.total.toLocaleString("ru-RU")} ₸</span>
                      <span className="ml-2 text-xs text-muted">
                        {p.count} {t("monitoring_sales_count")}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{t("monitoring_no_sales")}</p>
            )}
          </div>
        </div>

        {/* По страницам + последние действия */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line p-4">
            <div className="mb-2 text-sm font-medium">{t("monitoring_by_page")}</div>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="whitespace-nowrap py-1 pr-3">{t("monitoring_page")}</th>
                    <th className="whitespace-nowrap px-2 py-1 text-center">{t("event_page_view")}</th>
                    <th className="whitespace-nowrap px-2 py-1 text-center">{t("event_whatsapp")}</th>
                    <th className="whitespace-nowrap px-2 py-1 text-center">{t("event_call")}</th>
                    <th className="whitespace-nowrap px-2 py-1 text-center">{t("event_quote_open")}</th>
                    <th className="whitespace-nowrap px-2 py-1 text-center">{t("event_lead_submit")}</th>
                    <th className="whitespace-nowrap py-1 pl-2 text-center">{t("monitoring_total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {byPage?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-muted">
                        —
                      </td>
                    </tr>
                  )}
                  {byPage?.items.slice(0, 10).map((row) => (
                    <tr key={row.page} className="border-b border-line/50 last:border-0">
                      <td className="max-w-[220px] truncate py-1 pr-3">{row.page}</td>
                      <td className="px-2 py-1 text-center text-muted">{row.views}</td>
                      <td className="px-2 py-1 text-center">{row.whatsapp}</td>
                      <td className="px-2 py-1 text-center">{row.call}</td>
                      <td className="px-2 py-1 text-center">{row.quote_open}</td>
                      <td className="px-2 py-1 text-center">{row.lead_submit}</td>
                      <td className="py-1 pl-2 text-center font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("monitoring_recent_actions")}</span>
              <Link href="/events" className="text-xs font-medium text-brand-700 hover:underline">
                {t("monitoring_view_all_events")}
              </Link>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {recentEvents?.items.length === 0 && <p className="text-muted">—</p>}
              {recentEvents?.items.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-2 border-b border-line/50 py-1 last:border-0">
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="font-medium">{t(ACTION_KEY[event.event_type])}</span>
                    <span className="truncate text-xs text-muted">{event.page ?? "—"}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                    {new Date(event.created_at).toLocaleString("ru-RU")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── График посещаемости ── */}
      <section className="card mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{t("visits_chart_title")}</h2>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setDays(p)} className={`chip ${days === p ? "chip-active" : ""}`}>
                {t(`dashboard_period_${p}` as DictionaryKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitsChart}>
              <defs>
                <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b4fd0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6b4fd0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e0ef" />
              <XAxis dataKey="date" stroke="#65606d" fontSize={12} />
              <YAxis stroke="#65606d" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 14, borderColor: "#e5e0ef" }} />
              <Area
                type="monotone"
                dataKey="views"
                name={t("visits_views")}
                stroke="#563db8"
                strokeWidth={2.5}
                fill="url(#views)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name={t("visits_visitors")}
                stroke="#b8a5ed"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Статусы заявок ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        {statusCards.map((card) => (
          <div key={card.key} className="card p-4">
            <div className="text-xs text-muted">{card.label}</div>
            <div className="mt-2 text-2xl font-bold text-ink">{card.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* ── График заявок ── */}
      <section className="card mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{t("dashboard_chart_title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
            >
              <option value="">{t("dashboard_all_statuses")}</option>
              <option value="NEW">{t("status_new")}</option>
              <option value="QUALIFIED">{t("status_qualified")}</option>
              <option value="PROPOSAL">{t("status_proposal")}</option>
              <option value="IN_PROGRESS">{t("status_in_progress")}</option>
              <option value="WON">{t("status_won")}</option>
              <option value="DONE">{t("status_done")}</option>
              <option value="CANCELLED">{t("status_cancelled")}</option>
              <option value="DECLINED">{t("status_declined")}</option>
            </select>
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setDays(p)} className={`chip ${days === p ? "chip-active" : ""}`}>
                {t(`dashboard_period_${p}` as DictionaryKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e0ef" />
              <XAxis dataKey="date" stroke="#65606d" fontSize={12} />
              <YAxis stroke="#65606d" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 14, borderColor: "#e5e0ef" }} />
              <Line type="monotone" dataKey="count" stroke="#3e2c8d" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Последние заявки ── */}
      <section className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{t("dashboard_recent_leads")}</h2>
          <Link href="/leads" className="text-sm font-medium text-brand-700 hover:underline">
            {t("dashboard_view_all")}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-4">{t("leads_table_name")}</th>
                <th className="py-2 pr-4">{t("lead_contact")}</th>
                <th className="py-2 pr-4">{t("leads_table_category")}</th>
                <th className="py-2 pr-4">{t("leads_table_status")}</th>
                <th className="py-2 pr-4">{t("leads_table_created")}</th>
              </tr>
            </thead>
            <tbody>
              {recent?.items.map((lead) => (
                <tr key={lead.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-ink hover:text-brand-700">
                      {lead.name || requestKind(lead.source, t)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{lead.phone || lead.email || "—"}</td>
                  <td className="py-2 pr-4">{categoryLabel(lead.category, t)}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-2 pr-4 text-muted">{new Date(lead.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
