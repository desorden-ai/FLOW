"use client";

import type { ReactNode } from "react";
import { LogoTunnel } from "../components/LogoTunnel";
import { PortfolioController } from "../components/PortfolioController";
import { ProjectPicture } from "../components/ProjectPicture";
import { TextPrism3D } from "../components/TextPrism3D";

const scenes = [
  ["intro", "introducció", "intro"],
  ["pitch", "proposta", "pitch"],
  ["partners", "autoritat", "partners"],
  ["experience", "serveis", "experience"],
  ["about", "sobre nosaltres", "about"],
  ["cases", "casos d'èxit", "cases"],
  ["media-1", "projectes destacats", "media"],
  ["media-2", "projectes destacats", "media"],
  ["contact", "contacte", "contact"],
] as const;

const navigation = [
  ["introducció", 0],
  ["proposta", 1],
  ["autoritat", 2],
  ["serveis", 3],
  ["sobre nosaltres", 4],
  ["casos d'èxit", 5],
  ["projectes", 6],
  ["contacte", 8],
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

export function PortfolioApp() {
  return (
    <PortfolioController sceneCount={scenes.length}>
      <p
        style={visuallyHiddenStyle}
        aria-live="polite"
        aria-atomic="true"
        data-live-scene-label
      >
        introducció
      </p>

      <div className="media-marquee" data-media-marquee hidden aria-hidden="true">
        <p className="media-marquee__track" data-text="DESORDEN ✦ DESORDEN ✦ DESORDEN ✦ ">
          DESORDEN ✦ DESORDEN ✦ DESORDEN ✦
        </p>
      </div>

      <div className="scene-deck">
        <SceneFrame index={0} name="intro" label="introducció">
          <div className="intro-layout">
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Perfil en blanc i negre del creador de DESORDEN"
              width={768}
              height={1028}
              className="hero-picture"
              sizes="(max-width: 760px) 98vw, 48vw"
              eager
            />
            <header className="intro-heading">
              <h1 className="display-name hero-brand-title">DESORDEN</h1>
              <p className="micro-label">
                ( TECNOLÒGIC I CREATIU )
              </p>
              <ul className="hero-services" aria-label="Serveis principals">
                <li>Contingut visual per a xarxes socials</li>
                <li>Vídeo amb IA per visibilitzar marques i comerços</li>
                <li>Creació d&apos;una identitat visual coherent</li>
              </ul>
            </header>
          </div>
        </SceneFrame>

        <SceneFrame index={1} name="pitch" label="proposta">
          <header className="center-copy pitch-copy">
            <p className="eyebrow">Els nostres pilars</p>
            <h1 id="entity-title">Tot l&apos;arsenal que el teu negoci necessita, en un sol lloc.</h1>
            <p>Estratègia, identitat, web, automatització, contingut vertical, campanyes i producció aèria coordinats sota una mateixa direcció.</p>
            <TextPrism3D />
          </header>
        </SceneFrame>

        <SceneFrame index={2} name="partners" label="autoritat">
          <LogoTunnel />
        </SceneFrame>

        <SceneFrame index={3} name="experience" label="serveis">
          <div className="experience-panel">
            <p className="ghost-statement">SERVEIS</p>
            <h2>Què fem</h2>
            <div className="experience-list">
              {services.map((service) => (
                <div className="experience-row" id={service.id} key={service.title}>
                  <div><strong>{service.title}</strong><span>{service.description}</span></div>
                  <time>{service.tag}</time>
                </div>
              ))}
            </div>
          </div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="sobre nosaltres">
          <div className="about-panel">
            <h2>Benvinguts a Desorden.</h2>
            <ul>{personalNotes.map((note) => <li key={note}>✦ <span>{note}</span></li>)}</ul>
            <p className="about-meta"><a href="/sobre-nosaltres">Conèixer la nostra filosofia →</a></p>
          </div>
        </SceneFrame>

        <SceneFrame index={5} name="cases" label="casos d'èxit">
          <div className="case-panel">
            <p className="eyebrow">Casos d&apos;èxit</p>
            <div className="case-list">
              {cases.map(([number, title]) => <button type="button" key={number} data-modal-open={title}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
            </div>
          </div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 6} name="media" label="projectes destacats" key={number}>
            <button type="button" className="media-card" data-modal-open={title}>
              <ImagePlaceholder number={number} className="media-placeholder" label={`Imatge destacada: ${title}`} />
              <span className="media-title">{title}</span>
              <small>{meta} · OBRIR □</small>
            </button>
          </SceneFrame>
        ))}

        <SceneFrame index={8} name="contact" label="contacte">
          <div className="contact-mark" aria-hidden="true"><i /><i /><i /></div>
          <div className="contact-copy">
            <h2>FEM UN CAFÈ?</h2>
            <p className="contact-email"><a href="mailto:hola@desorden.cat">hola@desorden.cat</a></p>
            <p className="contact-place">CATALUNYA · ESPANYA</p>
            <p className="contact-name">AGÈNCIA DESORDEN</p>
            <p>Explica&apos;ns on ets i on vols arribar. Ens encanten els reptes impossibles.</p>
          </div>
        </SceneFrame>
      </div>

      <div className="fixed-ui">
        <p className="scene-counter" data-scene-counter>01 / 09</p>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Seccions de DESORDEN">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Secció</span><b data-active-label>introducció</b><i /></button>
        </nav>
      </div>

      <div className="modal-backdrop" data-modal role="presentation" hidden>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
          <button type="button" className="modal-close" data-modal-close aria-label="Tanca">×</button>
          <p className="eyebrow">Detall del servei</p>
          <h2 id="modal-title" data-modal-title>Detall del projecte</h2>
          <p>Descobreix el context, les decisions, la producció i els resultats de cada projecte DESORDEN.</p>
        </div>
      </div>

      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    </PortfolioController>
  );
}
