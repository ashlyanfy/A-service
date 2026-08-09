"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSent(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
        <h1 className="font-display text-xl font-bold">{t("forgot_title")}</h1>
        {sent ? (
          <p className="text-sm text-emerald-700">{t("forgot_sent")}</p>
        ) : (
          <>
            <p className="text-sm text-muted">{t("forgot_text")}</p>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.kz"
              required
            />
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {t("forgot_submit")}
            </button>
          </>
        )}
        <div className="text-center">
          <Link href="/login" className="text-sm text-brand-700 hover:underline">
            {t("back_to_login")}
          </Link>
        </div>
      </form>
    </div>
  );
}
