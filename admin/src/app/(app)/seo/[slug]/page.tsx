"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { Seo } from "@/types";

export default function SeoEditorPage() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Seo>({ title: "", description: "", keywords: "", og_image: "" });
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: seo } = useQuery({
    queryKey: ["seo", slug],
    queryFn: async () => (await api.get<Seo>(`/seo/${slug}`)).data,
  });

  useEffect(() => {
    if (seo) {
      setForm({
        title: seo.title ?? "",
        description: seo.description ?? "",
        keywords: seo.keywords ?? "",
        og_image: seo.og_image ?? "",
      });
    }
  }, [seo]);

  const save = useMutation({
    mutationFn: async () => (await api.patch<Seo>(`/seo/${slug}`, form)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["seo", slug], data);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
  });

  return (
    <div>
      <Header
        title={`SEO: /${slug}/`}
        actions={
          <>
            {savedFlash && <span className="text-sm font-medium text-emerald-600">{t("saved")}</span>}
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? t("saving") : t("save")}
            </button>
          </>
        }
      />

      <Link href="/seo" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={15} />
        {t("seo_title")}
      </Link>

      <div className="card max-w-2xl space-y-4 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("seo_field_title")}</span>
          <input
            className="input"
            maxLength={255}
            value={form.title ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <span className="mt-1 block text-right text-xs text-muted">{(form.title ?? "").length}/255</span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("seo_field_description")}</span>
          <textarea
            className="input min-h-28"
            maxLength={1000}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <span className="mt-1 block text-right text-xs text-muted">{(form.description ?? "").length}/1000</span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("seo_field_keywords")}</span>
          <input
            className="input"
            value={form.keywords ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("seo_field_og")}</span>
          <input
            className="input"
            value={form.og_image ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
            placeholder="https://a-service.asia/images/a-service-og-v2.png"
          />
        </label>
        <p className="text-xs text-muted">{t("seo_hint")}</p>
      </div>
    </div>
  );
}
