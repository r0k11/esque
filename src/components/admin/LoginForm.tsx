"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/auth-actions";
import forms from "./forms.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action} className={forms.stack} style={{ marginTop: "var(--sp-8)" }}>
      <input
        className={forms.input}
        name="email"
        type="email"
        placeholder="Почта"
        autoComplete="username"
        required
      />
      <input
        className={forms.input}
        name="password"
        type="password"
        placeholder="Пароль"
        autoComplete="current-password"
        required
      />
      {state?.error && <p className={forms.error}>{state.error}</p>}
      <button className={forms.primary} type="submit" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
