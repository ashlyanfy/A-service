"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
      <h1 className="font-display text-xl font-bold">{t("reset_title")}</h1>
      {done ? (
        <p className="text-sm text-emerald-700">{t("reset_done")}</p>
      ) : (
        <>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("reset_password")}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-red-600">{t("error_generic")}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {t("reset_submit")}
          </button>
        </>
      )}
      <div className="text-center">
        <Link href="/login" className="text-sm text-brand-700 hover:underline">
          {t("back_to_login")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 p-4">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
