"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LogoTunnel } from "../components/LogoTunnel";
import { PortfolioController } from "../components/PortfolioController";
import { ProjectPicture } from "../components/ProjectPicture";
import { VisualLayoutEditor, CanvasElementEdit } from "../components/VisualLayoutEditor";

const scenes = [
  ["intro", "introducció", "intro"],
  ["pitch", "elevator pitch", "pitch"],
  ["partners", "selected work", "partners"],
  ["experience", "com ho fem", "experience"],
  ["about", "sobre nosaltres", "about"],
  ["cases", "projectes", "cases"],
  ["media-1", "projectes destacats", "media"],
  ["media-2", "projectes destacats", "media"],
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
  ["contacte", 8],
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

export function PortfolioApp({ enableEditor = false }: { enableEditor?: boolean }) {
  const [publishedData, setPublishedData] = useState<Record<string, CanvasElementEdit> | null>(null);

  useEffect(() => {
    if (!enableEditor) {
      // In public view, fetch the published data and apply it
      fetch("/api/publish")
        .then(res => res.json())
        .then(data => {
          if (data && data.published_data) {
            try {
              const editMap = JSON.parse(data.published_data);
              setPublishedData(editMap);
              
              // Apply the published data to the DOM directly
              Object.entries(editMap).forEach(([selector, edit]: [string, any]) => {
                const el = document.querySelector(`[data-canvas-selector="${selector}"]`) as HTMLElement;
                if (el) {
                  if (edit.deletedAt) {
                    el.style.display = "none";
                  } else if (edit.hidden) {
                    el.style.visibility = "hidden";
                  } else {
                    if (edit.html) el.innerHTML = edit.html;
                    if (edit.styles) {
                      Object.assign(el.style, edit.styles);
                    }
                  }
                }
              });
            } catch (e) {
              console.error("Error parsing published data", e);
            }
          }
        })
        .catch(console.error);
    }
  }, [enableEditor]);

  return (
    <PortfolioController sceneCount={scenes.length}>
      {enableEditor && <VisualLayoutEditor />}
      <div id="global-canvas-layer" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}></div>
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
        <SceneFrame index={0} name="intro" label="introducción">
          <div className="intro-layout">
            <header className="intro-heading">
              <p className="micro-label" data-canvas-selector="hero-micro-label" title="Haz clic para editar en pantalla">( ESTUDIO CREATIVO · DESARROLLO WEB · IA · DRON )</p>
              <h1 className="hero-title">
                <span className="outline-word" data-canvas-selector="hero-title-1" title="Haz clic para editar en pantalla">CREAMOS</span>
                <span className="display-name" data-canvas-selector="hero-title-2" title="Haz clic para editar en pantalla">DESORDEN</span>
              </h1>
              <p className="hero-subtitle" data-canvas-selector="hero-subtitle" title="Haz clic para editar en pantalla">
                Tu partner tecnológico y productora audiovisual vertical (9:16). Plataformas web ultrarrápidas, experiencias con IA y contenido de impacto.
              </p>
              <ul className="hero-services" aria-label="Propuesta de valor de DESORDEN">
                <li data-canvas-selector="hero-service-1">◆ <strong>Web &amp; Branding:</strong> Identidades audaces y desarrollo a medida</li>
                <li data-canvas-selector="hero-service-2">◆ <strong>Audiovisual 9:16 &amp; Dron 4K:</strong> Producción vertical de alta conversión</li>
                <li data-canvas-selector="hero-service-3">◆ <strong>Automatización e IA:</strong> Flujos inteligentes y escalabilidad</li>
              </ul>
              <div className="hero-actions">
                <a
                  href="https://wa.me/34640925788?text=Hola%20DESORDEN,%20quiero%20impulsar%20mi%20proyecto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button-gold"
                  data-canvas-selector="hero-cta"
                >
                  HABLAR CON UN EXPERTO ◆
                </a>
              </div>
            </header>
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Perfil en blanco y negro del equipo creativo de DESORDEN"
              width={768}
              height={1028}
              className="hero-picture"
              sizes="(max-width: 760px) 82vw, 460px"
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
            {experience.map(([role, company, period], i) => <div className="experience-row" key={role} data-canvas-selector={`exp-row-${i}`}><div><strong>{role}</strong><span>{company}</span></div><time>{period}</time></div>)}
          </div></div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="sobre nosaltres">
          <div className="about-panel"><h2 data-canvas-selector="about-title">Sobre nosaltres</h2><ul>{personalNotes.map((note, i) => <li key={note} data-canvas-selector={`about-note-${i}`}>✦ <span>{note}</span></li>)}</ul><p className="about-meta" data-canvas-selector="about-meta">Catalunya · Operem on calgui</p></div>
        </SceneFrame>

        <SceneFrame index={5} name="cases" label="projectes">
          <div className="case-panel"><p className="eyebrow" data-canvas-selector="cases-eyebrow">Projectes</p><div className="case-list">
            {cases.map(([number, title], i) => <button type="button" key={number} data-modal-open={title} data-canvas-selector={`case-btn-${i}`}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
          </div></div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 6} name="media" label="projectes destacats" key={number}>
            <button type="button" className="media-card" data-modal-open={title} data-canvas-selector={`media-card-${mediaIndex}`}><ImagePlaceholder number={number} className="media-placeholder" label={`Imatge destacada: ${title}`} /><span className="media-title">{title}</span><small>{meta} · OBRIR □</small></button>
          </SceneFrame>
        ))}

        <SceneFrame index={8} name="contact" label="contacte"><div className="contact-mark" aria-hidden="true"><i /><i /><i /></div><div className="contact-copy"><h2 data-canvas-selector="contact-title">FEM UN CAFÈ?</h2><p className="contact-email" data-canvas-selector="contact-email"><a href="mailto:hola@desorden.cat">hola@desorden.cat</a></p><p className="contact-place" data-canvas-selector="contact-place">CATALUNYA · ESPANYA</p><p className="contact-name" data-canvas-selector="contact-name">AGÈNCIA DESORDEN</p><p data-canvas-selector="contact-desc">Explica&apos;ns on ets i on vols arribar. Ens encanten els reptes impossibles.</p></div></SceneFrame>
      </div>

      <div className="fixed-ui">
        <header><button type="button" className="brand" data-go="0" aria-label="Torna a la introducció"><ImagePlaceholder number="00" className="brand-placeholder" label="Marca substituïble de DESORDEN" /><span>DESORDEN</span></button><p data-scene-counter>01 / 09</p></header>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Seccions de DESORDEN">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Secció</span><b data-active-label>introducció</b><i /></button>
        </nav>
        <div className="scroll-cue" data-scroll-cue><span>Desplaça&apos;t per explorar</span><i /></div>
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
