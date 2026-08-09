"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { RequireRole } from "@/components/RequireRole";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";
import { isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { Setting } from "@/types";

const SITE_KEYS = ["contact_phone", "contact_whatsapp", "contact_email", "contact_person"] as const;

export default function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [siteForm, setSiteForm] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get<Setting[]>("/settings")).data,
    enabled: user?.role === "ADMIN",
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      for (const s of settings) {
        if (typeof s.value === "string") map[s.key] = s.value;
      }
      setSiteForm(map);
    }
  }, [settings]);

  useEffect(() => {
    isPushSubscribed().then(setPushOn).catch(() => undefined);
  }, []);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordChanged(false);
    setPasswordError(false);
    try {
      await api.patch("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordError(true);
    }
  };

  const saveSite = useMutation({
    mutationFn: async () => (await api.patch("/settings", { settings: siteForm })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    },
  });

  const togglePush = async () => {
    try {
      if (pushOn) {
        await unsubscribeFromPush();
        setPushOn(false);
      } else {
        const ok = await subscribeToPush();
        setPushOn(ok);
      }
    } catch {
      /* разрешение не выдано */
    }
  };

  return (
    <div>
      <Header title={t("settings_title")} />

      <div className="grid max-w-4xl grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Профиль */}
        <section className="card p-6">
          <h2 className="eyebrow mb-4">{t("settings_profile")}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("users_name")}</dt>
              <dd className="font-medium">{user?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("users_email")}</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("users_role")}</dt>
              <dd className="font-medium">{user?.role === "ADMIN" ? t("role_admin") : t("role_manager")}</dd>
            </div>
          </dl>

          <h2 className="eyebrow mb-3 mt-6">{t("settings_notifications")}</h2>
          <button type="button" className="btn-secondary" onClick={togglePush}>
            {pushOn ? <BellOff size={16} /> : <Bell size={16} />}
            {pushOn ? t("settings_push_disable") : t("settings_push_enable")}
          </button>
          {pushOn && (
            <button
              type="button"
              className="btn-secondary ml-2"
              onClick={() => api.post("/notifications/test", {}).catch(() => undefined)}
            >
              {t("settings_push_test")}
            </button>
          )}
        </section>

        {/* Смена пароля */}
        <section className="card p-6">
          <h2 className="eyebrow mb-4">{t("settings_password")}</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              className="input"
              placeholder={t("settings_current_password")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <input
              type="password"
              className="input"
              placeholder={t("settings_new_password")}
              value={newPassword}
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {passwordChanged && <p className="text-sm text-emerald-600">{t("settings_password_changed")}</p>}
            {passwordError && <p className="text-sm text-red-600">{t("error_generic")}</p>}
            <button type="submit" className="btn-primary">
              {t("settings_change_password")}
            </button>
          </form>
        </section>

        {/* Контакты сайта (только админ) */}
        <RequireRole roles={["ADMIN"]}>
          <section className="card p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="eyebrow">{t("settings_site")}</h2>
                <p className="mt-1 text-sm text-muted">{t("settings_site_hint")}</p>
              </div>
              <div className="flex items-center gap-3">
                {savedFlash && <span className="text-sm font-medium text-emerald-600">{t("saved")}</span>}
                <button type="button" className="btn-primary" onClick={() => saveSite.mutate()}>
                  {t("save")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SITE_KEYS.map((key) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-mono text-xs text-muted">{key}</span>
                  <input
                    className="input"
                    value={siteForm[key] ?? ""}
                    onChange={(e) => setSiteForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </section>
        </RequireRole>
      </div>
    </div>
  );
}
