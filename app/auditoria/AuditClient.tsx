"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
  "Validant el perfil públic",
  "Consultant les mètriques disponibles",
  "Calculant interacció i pes del vídeo",
  "Revisant els canals de conversió",
  "Generant recomanacions accionables",
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
  return value === null ? "No disponible" : `${percentFormatter.format(value)}%`;
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
    document.body.classList.add("audit-page-active");
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.classList.remove("audit-page-active");
      document.documentElement.style.height = htmlHeight;
      document.body.style.height = bodyHeight;

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

  const restart = () => {
    stopProgressTimer();
    setView("idle");
    setResult(null);
    setErrorMessage("");
    setProgress(0);
    setVisibleSteps(0);
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
      <div className="audit-grid" aria-hidden="true" />
      <div className="audit-glow audit-glow--one" aria-hidden="true" />
      <div className="audit-glow audit-glow--two" aria-hidden="true" />

      <header className="audit-header">
        <Link className="audit-brand" href="/" aria-label="DESORDEN, tornar a l’inici">
          <span className="audit-brand__mark"><i>DES</i><i>OR</i><i>DEN</i></span>
          <span className="audit-brand__lab">AUDIT LAB / 01</span>
        </Link>
        <Link className="audit-back" href="/">Tornar a la web <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="audit-shell" aria-labelledby="audit-title">
        {view === "idle" && (
          <div className="audit-intro">
            <div className="audit-kicker"><span /> EINA DE DIAGNÒSTIC AMB DADES PÚBLIQUES</div>
            <h1 id="audit-title">
              El teu Instagram
              <strong>converteix o només es veu?</strong>
            </h1>
            <p className="audit-lead">
              Analitzem fins a 12 publicacions recents per detectar interacció,
              pes del vídeo vertical i capacitat de conversió.
            </p>

            <form className="audit-search" onSubmit={runAudit}>
              <label htmlFor="instagram-username">Usuari o URL d’Instagram</label>
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
                <button type="submit">Analitzar perfil <b aria-hidden="true">→</b></button>
              </div>
            </form>

            <div className="audit-proof" aria-label="Característiques de l’auditoria">
              <span><b>01</b>Dades públiques</span>
              <span><b>02</b>Sense contrasenya</span>
              <span><b>03</b>Resultat accionable</span>
            </div>
          </div>
        )}

        {view === "loading" && (
          <section className="audit-console" aria-live="polite" aria-label="Auditoria en procés">
            <div className="audit-console__top">
              <span><i /> ANALITZANT @{username.replace(/^@/, "")}</span>
              <b>{progress}%</b>
            </div>
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
            <p>La consulta pot trigar fins a un minut segons la disponibilitat del proveïdor.</p>
          </section>
        )}

        {view === "error" && (
          <section className="audit-error" role="alert">
            <span className="audit-error__code">AUDIT / ERROR</span>
            <h2>No s’ha pogut completar l’anàlisi.</h2>
            <p>{errorMessage}</p>
            <div>
              <button type="button" onClick={restart}>Revisar l’usuari</button>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Comprovar a Instagram ↗</a>
            </div>
          </section>
        )}

        {view === "results" && result && (
          <div className="audit-results" data-status={result.status}>
            <section className="audit-summary">
              <div>
                <span className="audit-section-label">RESULTAT / @{result.username}</span>
                <h1>{result.statusLabel}</h1>
                <p>
                  Diagnòstic calculat sobre <b>{result.postsAnalyzed}</b> publicacions
                  públiques disponibles.
                </p>
                <span className="audit-source">
                  {result.source === "cache" ? "DADA EN CACHÉ · MÀX. 6 H" : "DADA CONSULTADA EN VIU"}
                </span>
              </div>
              <div
                className="audit-score"
                style={{ "--score": `${result.score * 3.6}deg` } as CSSProperties}
                aria-label={`Puntuació ${result.score} sobre 100`}
              >
                <div><strong>{result.score}</strong><span>/100</span></div>
              </div>
            </section>

            <section className="audit-metrics" aria-label="Mètriques del perfil">
              <article data-level={engagementLevel}>
                <header><span>01 / INTERACCIÓ</span><b>{metricLabel(engagementLevel)}</b></header>
                <strong>{formatPercentage(result.engagementRate)}</strong>
                <p>Mitjana de likes i comentaris per publicació respecte als seguidors.</p>
              </article>
              <article data-level={videoLevel}>
                <header><span>02 / VÍDEO</span><b>{metricLabel(videoLevel)}</b></header>
                <strong>{formatPercentage(result.videoRatio)}</strong>
                <p>Pes del vídeo i els Reels dins de la mostra de publicacions recents.</p>
              </article>
              <article data-level={result.hasCta ? "good" : "low"}>
                <header><span>03 / CONVERSIÓ</span><b>{result.hasCta ? "ACTIU" : "FALTA CTA"}</b></header>
                <strong>{result.hasCta ? "Enllaç detectat" : "Sense enllaç"}</strong>
                <p>Presència d’un canal extern a la bio per transformar visites en contactes.</p>
              </article>
              <article data-level="neutral">
                <header><span>04 / AUDIÈNCIA</span><b>PÚBLIC</b></header>
                <strong>{numberFormatter.format(result.followers)}</strong>
                <p>Seguidors indicats pel perfil públic en el moment de la consulta.</p>
              </article>
            </section>

            <section className="audit-recommendations">
              <div>
                <span className="audit-section-label">PRIORITATS / SEGÜENT CICLE</span>
                <h2>Què canviaria ara.</h2>
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
                <span className="audit-section-label">AUDITORIA COMPLETA</span>
                <h2>3 idees de Reels per al teu negoci.</h2>
                <p>
                  Envia el resultat per WhatsApp i rep una proposta inicial adaptada
                  al perfil, sense formularis opacs ni promeses automàtiques.
                </p>
              </div>
              <form onSubmit={sendLead}>
                <label htmlFor="lead-contact">Nom i contacte</label>
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
                  <span>Accepto iniciar una conversa amb DESORDEN per WhatsApp.</span>
                </label>
                <button type="submit">Enviar diagnòstic per WhatsApp <span aria-hidden="true">↗</span></button>
              </form>
            </section>

            <button className="audit-restart" type="button" onClick={restart}>← Auditar un altre perfil</button>
          </div>
        )}
      </section>

      <footer className="audit-footer">
        <span>DESORDEN © 2026</span>
        <p>
          Eina independent basada en dades públiques. No està afiliada, patrocinada
          ni validada per Instagram o Meta.
        </p>
      </footer>
    </main>
  );
}
