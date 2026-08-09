"use client";

import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/context";
import { PwaRegistrar } from "@/lib/pwa";
import { QueryProvider } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <I18nProvider>
        <AuthProvider>
          <PwaRegistrar />
          {children}
        </AuthProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
