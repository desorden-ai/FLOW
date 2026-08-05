"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { EditorPositionControls } from "../../components/EditorPositionControls";
import { PortfolioApp } from "../PortfolioApp";
import "./editor.css";
import "./position-controls.css";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        onLogin();
        return;
      }

      const payload: unknown = await response.json();
      const message = isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "No se pudo iniciar sesión";
      setError(response.status === 401 ? "Contraseña incorrecta" : message);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="editor-login">
      <form onSubmit={handleSubmit}>
        <p>DESORDEN</p>
        <h1>Acceso al editor</h1>
        {error && <div role="alert">{error}</div>}
        <label>
          CONTRASEÑA
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "ENTRANDO…" : "ENTRAR"}
        </button>
      </form>
    </main>
  );
}

export default function EditorPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          setAuthenticated(false);
          return;
        }

        const payload: unknown = await response.json();
        setAuthenticated(isRecord(payload) && payload.authenticated === true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAuthenticated(false);
      });

    return () => controller.abort();
  }, []);

  if (authenticated === null) {
    return <main className="editor-login editor-login--loading" aria-label="Comprobando sesión" />;
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <>
      <PortfolioApp enableEditor />
      <EditorPositionControls />
    </>
  );
}
