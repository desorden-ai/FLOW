"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { LogoTunnel } from "../components/LogoTunnel";
import { PortfolioController } from "../components/PortfolioController";
import { ProjectPicture } from "../components/ProjectPicture";
import { SocialProofCards } from "../components/SocialProofCards";
import { VisualLayoutEditor } from "../components/VisualLayoutEditor";
import {
  applyEditorDocument,
  parseStoredEditorDocument,
} from "../lib/editor-model";

const scenes = [
  ["intro", "introducció", "intro"],
  ["pitch", "elevator pitch", "pitch"],
  ["partners", "selected work", "partners"],
  ["experience", "com ho fem", "experience"],
  ["about", "sobre nosaltres", "about"],
  ["cases", "projectes", "cases"],
  ["media-1", "projectes destacats", "media"],
  ["media-2", "projectes destacats", "media"],
  ["social-proof-scene", "validació social", "social-proof"],
  ["contact", "contacte", "contact"],
] as const;

const navigation = [
  ["introducció", 0],
  ["elevator pitch", 1],
  ["selected work", 2],
  ["com ho fem", 3],
  ["sobre nosaltres", 4],
  ["projectes", 5],
  ["projectes destacats", 6],
  ["validació social", 8],
  ["contacte", 9],
] as const;

const experience = [
  ["Disseny Web & Branding", "Identitats trencadores i plataformes e-commerce ultraràpides.", "Escalable"],
  ["Producció Dron 4K", "Vol urbà (RD 517/2024). AESA, ENAIRE i permisos, ho gestionem nosaltres.", "Gestió integral"],
  ["IA i Automatització", "Processos repetitius automatitzats amb n8n i personatges virtuals integrats.", "Avantguarda"],
  ["Gestió d'Ajuts (Kit Digital)", "Avaluem l'elegibilitat i gestionem la tramitació amb Red.es.", "Segons convocatòria"],
  ["Social Media i Ads", "Estratègies verticals d'alta conversió per a Meta i TikTok.", "Mesurable"],
  ["Producció Audiovisual", "Vídeo vertical, fotografia i peces de marca amb un acabat prèmium.", "Impacte visual"],
];

const personalNotes = [
  "No som la típica agència de corbata, ni fem powerpoints infinits.",
  "Barregem tecnologia (IA, n8n) amb contingut fresc i plans aeris de pel·lícula.",
  "El mercat està saturat de clons. Nosaltres busquem l'impacte radical.",
  "Tu centra't en el teu negoci; nosaltres gestionem la producció i la documentació necessària.",
  "Som creadors, especialistes en IA i pilots. Hem vingut a fer soroll.",
];

const cases = [
  ["01", "Automatització amb IA i n8n"],
  ["02", "Webs orientades a vendes"],
  ["03", "Producció de dron 4K"],
  ["04", "Gestió de projectes de digitalització"],
];

const mediaItems = [
  ["14", "Identitat digital que trenca el patró", "Web · Branding · Catalunya"],
  ["15", "Vols urbans amb cobertura documental", "Dron 4K · AESA · ENAIRE"],
];

const visuallyHiddenStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

function ImagePlaceholder({ number, className = "", label }: { number: string; className?: string; label?: string }) {
  return <span className={`image-placeholder ${className}`.trim()} aria-label={label ?? `Imatge substituïble ${number}`} role="img">{number}</span>;
}

function SceneFrame({ index, name, label, children }: { index: number; name: string; label: string; children: ReactNode }) {
  const isInitialScene = index === 0;

  return (
    <section
      id={scenes[index][0]}
      className={`scene scene-${name}`}
      data-scene
      data-label={label}
      data-state={isInitialScene ? "current" : "future"}
      data-distance={Math.min(index, 3)}
      aria-hidden={!isInitialScene}
      inert={!isInitialScene}
    >
      {children}
    </section>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function PortfolioApp({ enableEditor = false }: { enableEditor?: boolean }) {
  useEffect(() => {
    if (enableEditor) return;

    const controller = new AbortController();

    void fetch("/api/publish", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!isRecord(payload)) return;

        const published = parseStoredEditorDocument(payload.published);
        if (published) applyEditorDocument(published.data, false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to load published editor data", error);
      });

    return () => controller.abort();
  }, [enableEditor]);

  return (
    <PortfolioController sceneCount={scenes.length}>
      {enableEditor && <VisualLayoutEditor />}
      <p
        style={visuallyHiddenStyle}
        aria-live="polite"
        aria-atomic="true"
        data-live-scene-label
      >
        introducció
      </p>

      <div className="media-marquee" data-media-marquee hidden aria-hidden="true">
        <p className="media-marquee__track" data-text="PROJECTES ✦ PROJECTES ✦ PROJECTES ✦ ">
          PROJECTES ✦ PROJECTES ✦ PROJECTES ✦
        </p>
      </div>

      <div className="scene-deck">
        <SceneFrame index={0} name="intro" label="introducció">
          <div className="intro-layout">
            <header className="intro-heading">
              <p className="outline-word" data-canvas-selector="hero-title-1" title="Selecciona para editar">EL TEU</p>
              <p className="display-name" data-canvas-selector="hero-title-2" title="Selecciona para editar">PARTNER</p>
              <p className="micro-label" data-canvas-selector="hero-micro-label" title="Selecciona para editar">( TECNOLÒGIC I CREATIU )</p>
              <ul className="hero-services" aria-label="Proposta de valor de DESORDEN">
                <li data-canvas-selector="hero-service-1">✦ Contingut visual per a xarxes socials</li>
                <li data-canvas-selector="hero-service-2">✦ Vídeo amb IA per visibilitzar marques i comerços</li>
                <li data-canvas-selector="hero-service-3">✦ Creació d&apos;una identitat visual coherent</li>
              </ul>
            </header>
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Perfil en blanc i negre del creador i director de DESORDEN"
              width={768}
              height={1028}
              className="hero-picture"
              sizes="(max-width: 760px) 82vw, 460px"
              canvasSelector="hero-picture"
              eager
            />
          </div>
        </SceneFrame>

        <SceneFrame index={1} name="pitch" label="elevator pitch">
          <header className="center-copy pitch-copy">
            <p className="eyebrow" data-canvas-selector="pitch-eyebrow">Elevator pitch</p>
            <h1 id="entity-title" data-canvas-selector="pitch-title">Passa de coordinar cinc proveïdors alhora. Integrem intel·ligència artificial, disseny web i audiovisual prèmium per escalar el teu negoci a Catalunya.</h1>
            <p data-canvas-selector="pitch-desc">Tot l&apos;arsenal que el teu negoci necessita en un sol lloc: estratègia, producció, automatització, web i operacions UAS.</p>
          </header>
        </SceneFrame>

        <SceneFrame index={2} name="partners" label="selected work">
          <LogoTunnel />
        </SceneFrame>

        <SceneFrame index={3} name="experience" label="com ho fem">
          <div className="experience-panel"><p className="ghost-statement" data-canvas-selector="exp-ghost">COM HO FEM</p><h2 data-canvas-selector="exp-title">Serveis</h2><div className="experience-list">
            {experience.map(([role, company, period], index) => <div className="experience-row" key={role} data-canvas-selector={`exp-row-${index}`}><div><strong>{role}</strong><span>{company}</span></div><time>{period}</time></div>)}
          </div></div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="sobre nosaltres">
          <div className="about-panel"><h2 data-canvas-selector="about-title">Sobre nosaltres</h2><ul>{personalNotes.map((note, index) => <li key={note} data-canvas-selector={`about-note-${index}`}>✦ <span>{note}</span></li>)}</ul><p className="about-meta" data-canvas-selector="about-meta">Catalunya · Operem on calgui</p></div>
        </SceneFrame>

        <SceneFrame index={5} name="cases" label="projectes">
          <div className="case-panel"><p className="eyebrow" data-canvas-selector="cases-eyebrow">Projectes</p><div className="case-list">
            {cases.map(([number, title], index) => <button type="button" key={number} data-modal-open={title} data-canvas-selector={`case-btn-${index}`}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
          </div></div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 6} name="media" label="projectes destacats" key={number}>
            <button type="button" className="media-card" data-modal-open={title} data-canvas-selector={`media-card-${mediaIndex}`}><ImagePlaceholder number={number} className="media-placeholder" label={`Imatge destacada: ${title}`} /><span className="media-title">{title}</span><small>{meta} · OBRIR □</small></button>
          </SceneFrame>
        ))}

        <SceneFrame index={8} name="social-proof" label="validació social">
          <SocialProofCards />
        </SceneFrame>

        <SceneFrame index={9} name="contact" label="contacte"><div className="contact-mark" aria-hidden="true"><i /><i /><i /></div><div className="contact-copy"><h2 data-canvas-selector="contact-title">FEM UN CAFÈ?</h2><p className="contact-email" data-canvas-selector="contact-email"><a href="mailto:hola@desorden.cat">hola@desorden.cat</a></p><p className="contact-place" data-canvas-selector="contact-place">CATALUNYA · ESPANYA</p><p className="contact-name" data-canvas-selector="contact-name">AGÈNCIA DESORDEN</p><p data-canvas-selector="contact-desc">Explica&apos;ns on ets i on vols arribar. Ens encanten els reptes impossibles.</p></div></SceneFrame>
      </div>

      <div className="fixed-ui">
        <header><button type="button" className="brand" data-go="0" aria-label="Torna a la introducció"><ImagePlaceholder number="00" className="brand-placeholder" label="Marca substituïble de DESORDEN" /><span>DESORDEN</span></button><p data-scene-counter>01 / 10</p></header>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Seccions de DESORDEN">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Secció</span><b data-active-label>introducció</b><i /></button>
        </nav>
        <div className="scroll-cue" data-scroll-cue><span>Desplaça&apos; t per explorar</span><i /></div>
      </div>

      <div className="modal-backdrop" data-modal role="presentation" hidden>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
          <button type="button" className="modal-close" data-modal-close aria-label="Tanca">×</button>
          <p className="eyebrow" data-canvas-selector="modal-eyebrow">Detall del servei</p><h2 id="modal-title" data-modal-title data-canvas-selector="modal-title">Detall del projecte</h2>
          <p data-canvas-selector="modal-desc">Descobreix el context, les decisions, la producció i els resultats de cada projecte DESORDEN. Els recursos multimèdia es mantenen optimitzats dins la carpeta local <code>public/media</code>.</p>
        </div>
      </div>

      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    </PortfolioController>
  );
}
