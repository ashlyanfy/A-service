"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setBusy(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="font-display text-2xl font-extrabold">A-SERVICE</div>
          <div className="mt-1 text-sm text-white/60">crm.a-service.asia</div>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 p-8">
          <h1 className="font-display text-xl font-bold">{t("login_title")}</h1>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">{t("login_email")}</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">{t("login_password")}</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{t("login_error")}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {t("login_submit")}
          </button>
          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">
              {t("login_forgot")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
