"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

const statusLabels = {
  pending: "mail_status_pending",
  sending: "mail_status_sending",
  sent: "mail_status_sent",
  review: "mail_status_review",
} as const;

interface Delivery {
  kind: "owner" | "customer";
  status: keyof typeof statusLabels;
  last_error: string | null;
  sent_at: number | null;
}

interface DeliveryList {
  items: Delivery[];
}

export function LeadMailDelivery({ leadId }: { leadId: string }) {
  const { language, t } = useI18n();
  const client = useQueryClient();
  const url = `/leads/${leadId}/mail`;
  const queryKey = ["lead-mail", leadId];
  const mail = useQuery({
    queryKey,
    queryFn: async () => (await api.get<DeliveryList>(url)).data,
    refetchInterval: (query) =>
      query.state.data?.items.some((d) => d.kind === "owner" && (d.status === "pending" || d.status === "sending"))
        ? 30_000 : false,
  });
  const retry = useMutation({
    mutationFn: async () => (await api.post<DeliveryList>(`${url}/owner/retry`)).data,
    onSuccess: (data) => client.setQueryData(queryKey, data),
    onError: () => client.invalidateQueries({ queryKey }),
  });

  return (
    <section className="card mt-5 p-5">
      <h2 className="eyebrow mb-3">{t("mail_status_title")}</h2>
      {mail.isPending && <p className="text-sm text-muted">{t("loading")}</p>}
      {(mail.isError || retry.isError) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span>{t(retry.isError ? "mail_retry_error" : "mail_unavailable")}</span>
          <button
            className="chip"
            type="button"
            onClick={() => { retry.reset(); void mail.refetch(); }}
          >
            {t("mail_refresh")}
          </button>
        </div>
      )}
      <ul className="space-y-2 text-sm">
        {mail.data?.items.map((delivery) => (
          <li key={delivery.kind} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">
              {t(delivery.kind === "owner" ? "mail_recipient_owner" : "mail_recipient_customer")}
            </span>
            <span className="text-muted">
              {t(delivery.kind === "customer" && delivery.last_error === "manual_fulfillment"
                ? "mail_status_manual" : statusLabels[delivery.status])}
            </span>
            {delivery.sent_at != null && (
              <time className="text-muted" dateTime={new Date(delivery.sent_at * 1000).toISOString()}>
                {new Date(delivery.sent_at * 1000).toLocaleString(language === "kk" ? "kk-KZ" : "ru-KZ")}
              </time>
            )}
            {delivery.kind === "owner" && delivery.status === "pending" && (
              <button type="button" className="chip" disabled={retry.isPending}
                onClick={() => retry.mutate()}>
                {t("mail_retry")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
