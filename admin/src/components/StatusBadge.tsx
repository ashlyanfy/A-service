"use client";

import { useI18n } from "@/lib/i18n/context";
import { LeadStatus } from "@/types";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-brand-100 text-brand-700",
  QUALIFIED: "bg-sky-100 text-sky-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  WON: "bg-emerald-100 text-emerald-700",
  DONE: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  DECLINED: "bg-red-100 text-red-600",
};

const KEYS = {
  NEW: "status_new",
  QUALIFIED: "status_qualified",
  PROPOSAL: "status_proposal",
  IN_PROGRESS: "status_in_progress",
  WON: "status_won",
  DONE: "status_done",
  CANCELLED: "status_cancelled",
  DECLINED: "status_declined",
} as const;

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { t } = useI18n();
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {t(KEYS[status])}
    </span>
  );
}
