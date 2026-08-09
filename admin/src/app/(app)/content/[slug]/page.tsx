"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import { ContentBlock, Page } from "@/types";

export default function ContentEditorPage() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const queryClient = useQueryClient();

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [title, setTitle] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: page } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => (await api.get<Page>(`/pages/${slug}`)).data,
  });

  useEffect(() => {
    if (page) {
      setBlocks(page.blocks);
      setTitle(page.title);
    }
  }, [page]);

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch<Page>(`/pages/${slug}`, { title, blocks })).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["page", slug], data);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
  });

  const setBlockData = (index: number, field: string, value: string) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, data: { ...b.data, [field]: value } } : b))
    );
  };

  const toggleBlock = (index: number) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, enabled: !b.enabled } : b)));
  };

  const moveBlock = (index: number, delta: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((b, i) => ({ ...b, order: i }));
    });
  };

  if (!page) return <div className="text-muted">{t("loading")}</div>;

  return (
    <div>
      <Header
        title={page.slug}
        actions={
          <>
            {savedFlash && <span className="text-sm font-medium text-emerald-600">{t("saved")}</span>}
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? t("saving") : t("save")}
            </button>
          </>
        }
      />

      <Link href="/content" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={15} />
        {t("content_title")}
      </Link>

      <div className="card mb-5 p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("content_field_title")}</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>

      <h2 className="eyebrow mb-3">{t("content_blocks")}</h2>
      <p className="mb-4 text-sm text-muted">{t("content_add_note")}</p>

      {blocks.length === 0 && <div className="card p-5 text-sm text-muted">—</div>}

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <section key={block.id} className={`card p-5 ${block.enabled ? "" : "opacity-60"}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 font-mono text-xs font-semibold text-brand-700">
                  {block.type}
                </span>
                <span className="font-mono text-xs text-muted">#{block.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="chip" onClick={() => moveBlock(index, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="chip" onClick={() => moveBlock(index, 1)}>
                  <ArrowDown size={13} />
                </button>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={block.enabled} onChange={() => toggleBlock(index)} />
                  {t("content_block_enabled")}
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(block.data).map(([field, value]) => {
                if (typeof value !== "string") return null;
                const long = value.length > 80 || value.includes("\n");
                return (
                  <label key={field} className="block text-sm">
                    <span className="mb-1 block font-mono text-xs text-muted">{field}</span>
                    {long ? (
                      <textarea
                        className="input min-h-24"
                        value={value}
                        onChange={(e) => setBlockData(index, field, e.target.value)}
                      />
                    ) : (
                      <input
                        className="input"
                        value={value}
                        onChange={(e) => setBlockData(index, field, e.target.value)}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
