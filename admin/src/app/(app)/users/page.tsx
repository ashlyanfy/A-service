"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/context";
import { Language, User, UserRole } from "@/types";

export default function UsersPage() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MANAGER" as UserRole,
    language: "ru" as Language,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post("/users", form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "MANAGER", language: "ru" });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) =>
      (await api.patch(`/users/${id}`, { role })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div>
      <Header
        title={t("users_title")}
        actions={
          <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {t("users_add")}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-5 grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="input"
            placeholder={t("users_name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="email"
            className="input"
            placeholder={t("users_email")}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            type="password"
            className="input"
            placeholder={`${t("users_password")} (${t("users_password_hint")})`}
            value={form.password}
            minLength={8}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
          >
            <option value="MANAGER">{t("role_manager")}</option>
            <option value="ADMIN">{t("role_admin")}</option>
          </select>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {t("save")}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3">{t("users_name")}</th>
              <th className="px-4 py-3">{t("users_email")}</th>
              <th className="px-4 py-3">{t("users_role")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="input w-auto"
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as UserRole })}
                  >
                    <option value="MANAGER">{t("role_manager")}</option>
                    <option value="ADMIN">{t("role_admin")}</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== me?.id && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        if (confirm(t("confirm_delete"))) remove.mutate(u.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
