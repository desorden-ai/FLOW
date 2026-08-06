import type { Metadata } from "next";
import { AuditClient } from "./AuditClient";
import "./auditoria.css";

export const metadata: Metadata = {
  title: "Auditoria d’Instagram en viu",
  description:
    "Diagnòstic de dades públiques d’Instagram: interacció, pes del vídeo vertical, conversió i recomanacions accionables.",
  alternates: {
    canonical: "/auditoria",
  },
  openGraph: {
    type: "website",
    url: "/auditoria",
    locale: "ca_ES",
    title: "Auditoria d’Instagram en viu — DESORDEN",
    description:
      "Analitza dades públiques del teu perfil i detecta oportunitats de vídeo, interacció i conversió.",
  },
};

export default function AuditoriaPage() {
  return <AuditClient />;
}
