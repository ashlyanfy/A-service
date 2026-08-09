"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { useI18n } from "@/lib/i18n/context";
import { LeadListResponse, LeadStatus } from "@/types";

const CATEGORY_KEYS: Record<string, string> = {
  "atm-installation": "cat_atm_installation",
  "transport-rigging": "cat_transport_rigging",
  "restoration-branding": "cat_restoration_branding",
  canopies: "cat_canopies",
  "corporate-logistics": "cat_corporate_logistics",
};

export default function LeadsPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data } = useQuery({
    queryKey: ["leads", "list", q, status, category, page],
    queryFn: async () =>
      (
        await api.get<LeadListResponse>("/leads", {
          params: {
            ...(q ? { q } : {}),
            ...(status ? { status } : {}),
            ...(category ? { category } : {}),
            page,
            page_size: pageSize,
          },
        })
      ).data,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const catLabel = (value: string | null) =>
    value && CATEGORY_KEYS[value] ? t(CATEGORY_KEYS[value] as never) : value ?? "—";

  return (
    <div>
      <Header
        title={t("leads_title")}
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadFile("/leads/export", "leads.xlsx")}
          >
            <Download size={16} />
            {t("leads_export")}
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs"
          placeholder={t("leads_search")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as LeadStatus | "");
            setPage(1);
          }}
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
        <select
          className="input w-auto"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("leads_table_category")}: —</option>
          {Object.entries(CATEGORY_KEYS).map(([value, key]) => (
            <option key={value} value={value}>
              {t(key as never)}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3">{t("leads_table_name")}</th>
              <th className="px-4 py-3">{t("leads_table_company")}</th>
              <th className="px-4 py-3">{t("leads_table_phone")}</th>
              <th className="px-4 py-3">{t("leads_table_category")}</th>
              <th className="px-4 py-3">{t("leads_table_status")}</th>
              <th className="px-4 py-3">{t("leads_table_created")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {t("leads_empty")}
                </td>
              </tr>
            )}
            {data?.items.map((lead) => (
              <tr key={lead.id} className="border-b border-line/60 transition hover:bg-brand-50/50 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-ink hover:text-brand-700">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{lead.company ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{lead.phone}</td>
                <td className="px-4 py-3">{catLabel(lead.category)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {new Date(lead.created_at).toLocaleString("ru-RU")}
                </td>
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
