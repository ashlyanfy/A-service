"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";
import { Language } from "@/types";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const { user } = useAuth();

  const choose = (lang: Language) => {
    setLanguage(lang);
    if (user) api.patch("/users/me/language", { language: lang }).catch(() => undefined);
  };

  return (
    <div className="flex gap-1 rounded-full border border-line bg-white p-1">
      {(["ru", "kk"] as Language[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => choose(lang)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
            language === lang ? "bg-brand-700 text-white" : "text-muted hover:text-brand-700"
          }`}
        >
          {lang === "ru" ? "RU" : "ҚАЗ"}
        </button>
      ))}
    </div>
  );
}
