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
  ["intro", "inici", "intro"],
  ["pitch", "proposta", "pitch"],
  ["partners", "autoritat", "partners"],
  ["experience", "serveis", "experience"],
  ["about", "sobre nosaltres", "about"],
  ["cases", "casos d'èxit", "cases"],
  ["media-1", "projectes destacats", "media"],
  ["media-2", "projectes destacats", "media"],
  ["social-proof-scene", "validació social", "social-proof"],
  ["contact", "contacte", "contact"],
] as const;

const navigation = [
  ["inici", 0],
  ["proposta", 1],
  ["autoritat", 2],
  ["serveis", 3],
  ["sobre nosaltres", 4],
  ["casos d'èxit", 5],
  ["projectes", 6],
  ["validació social", 8],
  ["contacte", 9],
] as const;

const services = [
  {
    id: "disseny-web",
    title: "Disseny Web & Branding",
    description: "Creem identitats visuals trencadores i plataformes e-commerce ultraràpides, accessibles i preparades per vendre.",
    tag: "Web · Branding",
  },
  {
    id: "drons",
    title: "Producció Dron 4K",
    description: "Imatges aèries per a empresa, indústria i promoció. Planifiquem l'operació i coordinem la documentació aplicable.",
    tag: "UAS · Audiovisual",
  },
  {
    id: "ia-automatitzacio",
    title: "IA i Automatització",
    description: "Automatitzem processos repetitius amb n8n i integrem intel·ligència artificial en fluxos, continguts i experiències digitals.",
    tag: "IA · n8n",
  },
  {
    id: "social-media",
    title: "Social Media i Contingut",
    description: "Estratègia, campanyes Ads i producció vertical per transformar visibilitat en demanda que es noti al negoci.",
    tag: "Vertical · Ads",
  },
];

const personalNotes = [
  "No som la típica agència de corbata ni fem presentacions infinites.",
  "Barregem IA, automatització, web, contingut vertical i producció amb dron sota una mateixa direcció.",
  "Fem que les coses siguin potents visualment, però sobretot les orientem a generar negoci.",
];

const cases = [
  ["01", "Automatització de processos amb IA i n8n"],
  ["02", "Webs i e-commerce orientats a conversió"],
  ["03", "Producció audiovisual i operacions amb dron"],
  ["04", "Estratègia de contingut vertical i campanyes Ads"],
];

const mediaItems = [
  ["14", "Seguiment d'obra industrial i civil", "Dron 4K · Planificació · Edició"],
  ["15", "Campanyes visuals per a turisme i immobiliari", "Web · Vídeo vertical · Dron"],
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
        inici
      </p>

      <div className="media-marquee" data-media-marquee hidden aria-hidden="true">
        <p className="media-marquee__track" data-text="DESORDEN ✦ DESORDEN ✦ DESORDEN ✦ ">
          DESORDEN ✦ DESORDEN ✦ DESORDEN ✦
        </p>
      </div>

      <div className="scene-deck">
        <SceneFrame index={0} name="intro" label="inici">
          <div className="intro-layout">
            <header className="home-hero-copy">
              <p className="commercial-eyebrow" data-canvas-selector="hero-micro-label">Agència creativa i tecnològica · Catalunya</p>
              <h1 className="home-hero-title" data-canvas-selector="hero-title-1">
                El teu únic <strong>partner tecnològic i creatiu</strong> per escalar el teu negoci a Catalunya.
              </h1>
              <p className="home-hero-subtitle" data-canvas-selector="hero-subtitle">
                Passa de coordinar cinc agències alhora. Integrem intel·ligència artificial, disseny web orientat a vendes i producció audiovisual prèmium per dominar el teu sector.
              </p>
              <div className="home-hero-actions">
                <button type="button" className="home-button home-button--primary" data-go={9} data-canvas-selector="hero-cta-primary">Vull una auditoria gratuïta</button>
                <button type="button" className="home-button home-button--secondary" data-go={5} data-canvas-selector="hero-cta-secondary">Veure casos d&apos;èxit</button>
              </div>
              <div className="home-authority" aria-label="Credencials i capacitats">
                <span data-canvas-selector="authority-1">Projectes digitals i ajuts</span>
                <span data-canvas-selector="authority-2">Operador UAS i pilot certificat</span>
                <span data-canvas-selector="authority-3">Automatitzacions amb n8n</span>
              </div>
            </header>
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Creador i director de DESORDEN"
              width={768}
              height={1028}
              className="hero-picture"
              sizes="(max-width: 760px) 82vw, 460px"
              canvasSelector="hero-picture"
              eager
            />
          </div>
        </SceneFrame>

        <SceneFrame index={1} name="pitch" label="proposta">
          <header className="center-copy pitch-copy">
            <p className="eyebrow" data-canvas-selector="pitch-eyebrow">Els nostres pilars</p>
            <h1 id="entity-title" data-canvas-selector="pitch-title">Tot l&apos;arsenal que el teu negoci necessita, en un sol lloc.</h1>
            <p data-canvas-selector="pitch-desc">Estratègia, identitat, web, automatització, contingut vertical, campanyes i producció aèria coordinats sota una mateixa direcció.</p>
          </header>
        </SceneFrame>

        <SceneFrame index={2} name="partners" label="autoritat">
          <LogoTunnel />
        </SceneFrame>

        <SceneFrame index={3} name="experience" label="serveis">
          <div className="experience-panel">
            <p className="ghost-statement" data-canvas-selector="exp-ghost">SERVEIS</p>
            <h2 data-canvas-selector="exp-title">Què fem</h2>
            <div className="experience-list">
              {services.map((service, index) => (
                <div className="experience-row" id={service.id} key={service.title} data-canvas-selector={`exp-row-${index}`}>
                  <div><strong>{service.title}</strong><span>{service.description}</span></div>
                  <time>{service.tag}</time>
                </div>
              ))}
            </div>
          </div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="sobre nosaltres">
          <div className="about-panel">
            <h2 data-canvas-selector="about-title">Benvinguts a Desorden.</h2>
            <ul>{personalNotes.map((note, index) => <li key={note} data-canvas-selector={`about-note-${index}`}>✦ <span>{note}</span></li>)}</ul>
            <p className="about-meta" data-canvas-selector="about-meta"><a href="/sobre-nosaltres">Conèixer la nostra filosofia →</a></p>
          </div>
        </SceneFrame>

        <SceneFrame index={5} name="cases" label="casos d'èxit">
          <div className="case-panel">
            <p className="eyebrow" data-canvas-selector="cases-eyebrow">Casos d&apos;èxit</p>
            <div className="case-list">
              {cases.map(([number, title], index) => <button type="button" key={number} data-modal-open={title} data-canvas-selector={`case-btn-${index}`}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
            </div>
          </div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 6} name="media" label="projectes destacats" key={number}>
            <button type="button" className="media-card" data-modal-open={title} data-canvas-selector={`media-card-${mediaIndex}`}>
              <ImagePlaceholder number={number} className="media-placeholder" label={`Imatge destacada: ${title}`} />
              <span className="media-title">{title}</span>
              <small>{meta} · OBRIR □</small>
            </button>
          </SceneFrame>
        ))}

        <SceneFrame index={8} name="social-proof" label="validació social">
          <SocialProofCards />
        </SceneFrame>

        <SceneFrame index={9} name="contact" label="contacte">
          <div className="contact-mark" aria-hidden="true"><i /><i /><i /></div>
          <div className="contact-copy">
            <h2 data-canvas-selector="contact-title">FEM UN CAFÈ?</h2>
            <p className="contact-email" data-canvas-selector="contact-email"><a href="mailto:hola@desorden.cat">hola@desorden.cat</a></p>
            <p className="contact-place" data-canvas-selector="contact-place">CATALUNYA · ESPANYA</p>
            <p className="contact-name" data-canvas-selector="contact-name">AGÈNCIA DESORDEN</p>
            <p data-canvas-selector="contact-desc">Explica&apos;ns on ets i on vols arribar. Ens encanten els reptes impossibles.</p>
          </div>
        </SceneFrame>
      </div>

      <div className="fixed-ui">
        <header><button type="button" className="brand" data-go="0" aria-label="Torna a l'inici"><ImagePlaceholder number="00" className="brand-placeholder" label="Marca substituïble de DESORDEN" /><span>DESORDEN</span></button><p data-scene-counter>01 / 10</p></header>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Seccions de DESORDEN">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Secció</span><b data-active-label>inici</b><i /></button>
        </nav>
        <div className="scroll-cue" data-scroll-cue><span>Desplaça&apos;t per explorar</span><i /></div>
      </div>

      <div className="modal-backdrop" data-modal role="presentation" hidden>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
          <button type="button" className="modal-close" data-modal-close aria-label="Tanca">×</button>
          <p className="eyebrow" data-canvas-selector="modal-eyebrow">Detall del servei</p>
          <h2 id="modal-title" data-modal-title data-canvas-selector="modal-title">Detall del projecte</h2>
          <p data-canvas-selector="modal-desc">Descobreix el context, les decisions, la producció i els resultats de cada projecte DESORDEN.</p>
        </div>
      </div>

      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    </PortfolioController>
  );
}
