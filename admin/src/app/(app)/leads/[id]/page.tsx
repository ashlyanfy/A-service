"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { LeadMailDelivery } from "@/components/LeadMailDelivery";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { useI18n } from "@/lib/i18n/context";
import { categoryLabel, requestKind } from "@/lib/lead-labels";
import { LeadDetail, LeadStatus, User } from "@/types";

const STATUSES: LeadStatus[] = [
  "NEW", "QUALIFIED", "PROPOSAL", "IN_PROGRESS", "WON", "DONE", "CANCELLED", "DECLINED",
];

const STATUS_KEYS: Record<LeadStatus, string> = {
  NEW: "status_new",
  QUALIFIED: "status_qualified",
  PROPOSAL: "status_proposal",
  IN_PROGRESS: "status_in_progress",
  WON: "status_won",
  DONE: "status_done",
  CANCELLED: "status_cancelled",
  DECLINED: "status_declined",
};

export default function LeadDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadId = params.id;

  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: lead } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => (await api.get<LeadDetail>(`/leads/${leadId}`)).data,
  });

  const materialDownload = useMutation({
    mutationFn: (locale: string) => downloadFile(
      `/leads/${leadId}/material`, `A-SERVICE-profile-${locale}.pdf`,
    ),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  useEffect(() => {
    if (lead) setAmount(lead.deal_amount ?? "");
  }, [lead]);

  const update = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.patch<LeadDetail>(`/leads/${leadId}`, payload)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["lead", leadId], data);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
  });

  const addNote = useMutation({
    mutationFn: async () => (await api.post(`/leads/${leadId}/notes`, { body: note })).data,
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/leads/${leadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push("/leads");
    },
  });

  if (!lead) return <div className="text-muted">{t("loading")}</div>;

  const websiteRequest = lead.source === "website_service" || lead.source === "website_material";

  const requestRows: [string, React.ReactNode][] = [
    [t("lead_field_category"), categoryLabel(lead.category, t)],
    [t("lead_field_subtask"), lead.subtask ?? "—"],
    [t("lead_field_city"), lead.city ?? "—"],
    [t("lead_field_quantity"), lead.quantity ?? "—"],
    [t("lead_field_date"), lead.preferred_date ? new Date(lead.preferred_date).toLocaleDateString("ru-RU") : "—"],
    [t("lead_field_source_page"), lead.source_page ?? "—"],
    [t("lead_field_locale"), lead.locale?.toUpperCase() ?? "—"],
  ];

  return (
    <div>
      <Header
        title={lead.name || requestKind(lead.source, t)}
        actions={
          <>
            {savedFlash && <span className="text-sm font-medium text-emerald-600">{t("lead_saved")}</span>}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => downloadFile(`/leads/${leadId}/export`, `lead-${leadId}.xlsx`)}
            >
              <Download size={16} />
              {t("lead_export_one")}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                if (confirm(t("confirm_delete"))) remove.mutate();
              }}
            >
              <Trash2 size={16} />
              {t("lead_delete")}
            </button>
          </>
        }
      />

      <Link href="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={15} />
        {t("lead_back")}
      </Link>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Контакт */}
        <section className="card p-5">
          <h2 className="eyebrow mb-3">{t("lead_contact")}</h2>
          <dl className="space-y-2 text-sm">
            <Row label={t("lead_field_name")}>{lead.name || "—"}</Row>
            <Row label={t("lead_field_company")}>{lead.company ?? "—"}</Row>
            <Row label={t("lead_field_phone")}>
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-brand-700 hover:underline">
                  {lead.phone}
                </a>
              ) : "—"}
            </Row>
            <Row label={t("lead_field_email")}>
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="text-brand-700 hover:underline">
                  {lead.email}
                </a>
              ) : (
                "—"
              )}
            </Row>
          </dl>

          <h2 className="eyebrow mb-3 mt-6">{t("lead_meta")}</h2>
          <dl className="space-y-2 text-xs text-muted">
            <Row label="IP">{lead.ip ?? "—"}</Row>
            <Row label="User-Agent">
              <span className="line-clamp-2 break-all">{lead.user_agent ?? "—"}</span>
            </Row>
            <Row label={t("leads_table_created")}>{new Date(lead.created_at).toLocaleString("ru-RU")}</Row>
          </dl>
        </section>

        {/* Запрос */}
        <section className="card p-5">
          <h2 className="eyebrow mb-3">{t("lead_request")}</h2>
          <dl className="space-y-2 text-sm">
            {websiteRequest && (
              <Row label={t("request_source_kind")}>{requestKind(lead.source, t)}</Row>
            )}
            {requestRows.map(([label, value]) => (
              <Row key={label} label={label}>
                {value}
              </Row>
            ))}
          </dl>
          {lead.message && (
            <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm">
              <div className="mb-1 text-xs font-semibold text-muted">{t("lead_field_message")}</div>
              <p className="whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}
          {lead.source === "website_material" && lead.category === "bank-profile" && (
            <div className="mt-4">
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={materialDownload.isPending}
                onClick={() => materialDownload.mutate(lead.locale === "kk" ? "kk" : "ru")}
              >
                <Download size={16} />
                {t("lead_manual_pdf")}
              </button>
              {materialDownload.isError && (
                <p role="alert" className="mt-2 text-sm text-red-700">{t("lead_manual_pdf_error")}</p>
              )}
            </div>
          )}
          {lead.attachment_name && (
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={() => downloadFile(`/leads/${leadId}/attachment`, lead.attachment_name || "attachment")}
            >
              <Paperclip size={15} />
              {t("lead_download_attachment")}: {lead.attachment_name}
            </button>
          )}
        </section>

        {/* Управление */}
        <section className="card p-5">
          <h2 className="eyebrow mb-3">{t("lead_field_status")}</h2>
          <div className="mb-3">
            <StatusBadge status={lead.status} />
          </div>
          <select
            className="input"
            value={lead.status}
            onChange={(e) => update.mutate({ status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEYS[s] as never)}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted">{t("lead_field_assignee")}</span>
            <select
              className="input"
              value={lead.assignee_id ?? ""}
              onChange={(e) => update.mutate({ assignee_id: e.target.value || null })}
            >
              <option value="">{t("lead_no_assignee")}</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted">{t("lead_field_amount")}</span>
            <div className="flex gap-2">
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => update.mutate({ deal_amount: amount ? amount.replace(",", ".") : null })}
              >
                {t("save")}
              </button>
            </div>
          </label>
        </section>
      </div>

      {websiteRequest && <LeadMailDelivery leadId={lead.id} />}

      {/* Заметки */}
      <section className="card mt-5 p-5">
        <h2 className="eyebrow mb-4">{t("lead_notes")}</h2>
        <div className="space-y-3">
          {lead.notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-line p-3 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>{n.author?.name ?? "—"}</span>
                <span>{new Date(n.created_at).toLocaleString("ru-RU")}</span>
              </div>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="input"
            placeholder={t("lead_note_placeholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && note.trim()) addNote.mutate();
            }}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!note.trim() || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            {t("lead_note_add")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
