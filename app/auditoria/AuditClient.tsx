"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { InstagramAuditResult } from "../../lib/instagram-audit";

type ViewState = "idle" | "loading" | "results" | "error";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

const WHATSAPP_NUMBER = "34640925788";
const LOADING_STEPS = [
  "Perfil públic",
  "Interacció",
  "Vídeo vertical",
  "Conversió",
  "Diagnòstic",
] as const;

const numberFormatter = new Intl.NumberFormat("ca-ES");
const percentFormatter = new Intl.NumberFormat("ca-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${percentFormatter.format(value)}%`;
}

function metricLevel(
  value: number | null,
  thresholds: [number, number],
): "good" | "medium" | "low" | "unknown" {
  if (value === null) return "unknown";
  if (value >= thresholds[1]) return "good";
  if (value >= thresholds[0]) return "medium";
  return "low";
}

function metricLabel(level: ReturnType<typeof metricLevel>): string {
  if (level === "good") return "FORT";
  if (level === "medium") return "ESTABLE";
  if (level === "low") return "A REVISAR";
  return "SENSE DADES";
}

export function AuditClient() {
  const [view, setView] = useState<ViewState>("idle");
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<InstagramAuditResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const htmlHeight = document.documentElement.style.height;
    const bodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.classList.add("audit-page-active");

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.height = htmlHeight;
      document.body.style.height = bodyHeight;
      document.body.classList.remove("audit-page-active");

      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const engagementLevel = useMemo(
    () => metricLevel(result?.engagementRate ?? null, [1, 3]),
    [result],
  );
  const videoLevel = useMemo(
    () => metricLevel(result?.videoRatio ?? null, [35, 60]),
    [result],
  );

  const stopProgressTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    setProgress(8);
    setVisibleSteps(1);

    let tick = 0;
    timerRef.current = window.setInterval(() => {
      tick += 1;
      setProgress((current) => Math.min(88, current + (current < 55 ? 9 : 4)));
      setVisibleSteps(Math.min(LOADING_STEPS.length, Math.floor(tick / 2) + 1));
    }, 520);
  };

  const runAudit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = username.trim();
    if (!value) return;

    setView("loading");
    setResult(null);
    setErrorMessage("");
    startProgressTimer();

    try {
      const request = fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value, website: "" }),
      }).then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | InstagramAuditResult
          | ApiError
          | null;

        if (!response.ok) {
          const message =
            payload && "error" in payload
              ? payload.error?.message
              : "No s’ha pogut completar l’auditoria.";
          throw new Error(message || "No s’ha pogut completar l’auditoria.");
        }

        return payload as InstagramAuditResult;
      });

      const [audit] = await Promise.all([request, wait(2_200)]);
      stopProgressTimer();
      setVisibleSteps(LOADING_STEPS.length);
      setProgress(100);
      await wait(260);
      setResult(audit);
      setUsername(audit.username);
      setView("results");
    } catch (error) {
      stopProgressTimer();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No s’ha pogut completar l’auditoria.",
      );
      setView("error");
    }
  };

  const restart = (clearUsername = false) => {
    stopProgressTimer();
    setView("idle");
    setResult(null);
    setErrorMessage("");
    setProgress(0);
    setVisibleSteps(0);
    if (clearUsername) setUsername("");
  };

  const sendLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!result) return;

    const form = new FormData(event.currentTarget);
    const contact = String(form.get("contact") ?? "").trim();
    const message = [
      "Hola DESORDEN, vull completar l’auditoria d’Instagram.",
      `Perfil: @${result.username}`,
      `Puntuació inicial: ${result.score}/100 (${result.statusLabel})`,
      `Contacte: ${contact}`,
      "M’interessen 3 idees de Reels adaptades al meu negoci.",
    ].join("\n");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, "_blank");
    if (opened) opened.opener = null;
    else window.location.assign(url);
  };

  return (
    <main className="audit-page">
      <header className="audit-header">
        <Link className="audit-brand" href="/" aria-label="DESORDEN, tornar a l’inici">
          <span className="audit-brand__mark">
            <i>DES</i><i>OR</i><i>DEN</i>
          </span>
          <span className="audit-brand__lab">AUDIT LAB / 01</span>
        </Link>
        <Link className="audit-back" href="/">TORNAR A LA WEB <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="audit-shell" aria-labelledby="audit-title">
        {view === "idle" && (
          <div className="audit-intro">
            <span className="audit-index">01 / INSTAGRAM</span>
            <h1 id="audit-title">
              <span>AUDITA EL TEU</span>
              <strong>PERFIL</strong>
            </h1>
            <p className="audit-subline">( DADES PÚBLIQUES / RESULTAT EN VIU )</p>

            <ul className="audit-benefits" aria-label="Contingut de l’auditoria">
              <li>Interacció real</li>
              <li>Pes dels Reels</li>
              <li>Capacitat de conversió</li>
            </ul>

            <form className="audit-search" onSubmit={runAudit}>
              <label htmlFor="instagram-username">PERFIL D’INSTAGRAM</label>
              <div className="audit-search__row">
                <span aria-hidden="true">@</span>
                <input
                  id="instagram-username"
                  name="username"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={120}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="el_teu_usuari"
                  required
                />
                <button type="submit">ANALITZAR <b aria-hidden="true">↗</b></button>
              </div>
            </form>
          </div>
        )}

        {view === "loading" && (
          <section className="audit-console" aria-live="polite" aria-label="Auditoria en procés">
            <span className="audit-index">02 / PROCESSANT</span>
            <div className="audit-console__headline">
              <h2>ANALITZANT</h2>
              <strong>{progress}%</strong>
            </div>
            <p>@{username.replace(/^@/, "")}</p>
            <div className="audit-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <ol>
              {LOADING_STEPS.map((step, index) => (
                <li key={step} data-active={index < visibleSteps ? "true" : "false"}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                  <b>{index < visibleSteps ? "OK" : "—"}</b>
                </li>
              ))}
            </ol>
          </section>
        )}

        {view === "error" && (
          <section className="audit-error" role="alert">
            <span className="audit-index">AUDIT / ERROR</span>
            <h2>NO S’HA POGUT COMPLETAR.</h2>
            <p>{errorMessage}</p>
            <div className="audit-error__actions">
              <button type="button" onClick={() => restart(false)}>REVISAR L’USUARI</button>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a>
            </div>
          </section>
        )}

        {view === "results" && result && (
          <div className="audit-results" data-status={result.status}>
            <section className="audit-summary">
              <div>
                <span className="audit-index">03 / RESULTAT</span>
                <h1>@{result.username}</h1>
                <p>{result.statusLabel}</p>
                <small>
                  {result.postsAnalyzed} publicacions · {result.source === "cache" ? "caché" : "en viu"}
                </small>
              </div>
              <div className="audit-score" aria-label={`Puntuació ${result.score} sobre 100`}>
                <strong>{result.score}</strong>
                <span>/100</span>
              </div>
            </section>

            <section className="audit-metrics" aria-label="Mètriques del perfil">
              <article className="audit-metric audit-metric--accent" data-level={engagementLevel}>
                <header><span>01 / INTERACCIÓ</span><b>{metricLabel(engagementLevel)}</b></header>
                <strong>{formatPercentage(result.engagementRate)}</strong>
              </article>
              <article className="audit-metric" data-level={videoLevel}>
                <header><span>02 / REELS</span><b>{metricLabel(videoLevel)}</b></header>
                <strong>{formatPercentage(result.videoRatio)}</strong>
              </article>
              <article className="audit-metric" data-level={result.hasCta ? "good" : "low"}>
                <header><span>03 / CTA</span><b>{result.hasCta ? "ACTIU" : "FALTA"}</b></header>
                <strong>{result.hasCta ? "SÍ" : "NO"}</strong>
              </article>
              <article className="audit-metric" data-level="neutral">
                <header><span>04 / SEGUIDORS</span><b>PÚBLIC</b></header>
                <strong>{numberFormatter.format(result.followers)}</strong>
              </article>
            </section>

            <section className="audit-recommendations">
              <div>
                <span className="audit-index">04 / PRIORITATS</span>
                <h2>3 CANVIS.</h2>
              </div>
              <ol>
                {result.recommendations.map((recommendation, index) => (
                  <li key={recommendation}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{recommendation}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="audit-conversion">
              <div>
                <span className="audit-index">SEGÜENT PAS</span>
                <h2>3 IDEES DE REELS.</h2>
              </div>
              <form onSubmit={sendLead}>
                <label htmlFor="lead-contact">NOM I CONTACTE</label>
                <input
                  id="lead-contact"
                  name="contact"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Nom · telèfon o correu"
                  required
                />
                <label className="audit-consent">
                  <input type="checkbox" required />
                  <span>Accepto obrir una conversa per WhatsApp.</span>
                </label>
                <button type="submit">ENVIAR PER WHATSAPP <span aria-hidden="true">↗</span></button>
              </form>
            </section>

            <button className="audit-restart" type="button" onClick={() => restart(true)}>
              ← AUDITAR UN ALTRE PERFIL
            </button>
          </div>
        )}
      </section>

      <footer className="audit-footer">
        <span>DESORDEN © 2026</span>
        <p>Dades públiques · Eina independent de Meta.</p>
      </footer>
    </main>
  );
}
