"use client";

import { GlobalSearch } from "./GlobalSearch";

export function Header({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <GlobalSearch />
      </div>
    </div>
  );
}
