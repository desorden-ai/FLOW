import type { ReactNode } from "react";
import { PortfolioController } from "../components/PortfolioController";
import { ProjectPicture } from "../components/ProjectPicture";

const scenes = [
  ["intro", "introducció", "intro"],
  ["pitch", "elevator pitch", "pitch"],
  ["partners", "selected work", "partners"],
  ["experience", "com ho fem", "experience"],
  ["about", "sobre nosaltres", "about"],
  ["social-proof-scene", "validació social", "social-proof"],
  ["cases", "projectes", "cases"],
  ["media-1", "projectes destacats", "media"],
  ["media-2", "projectes destacats", "media"],
  ["media-3", "projectes destacats", "media"],
  ["media-4", "projectes destacats", "media"],
  ["media-5", "projectes destacats", "media"],
  ["media-6", "projectes destacats", "media"],
  ["manifesto", "inversió", "manifesto"],
  ["contact", "contacte", "contact"],
] as const;

const navigation = [
  ["introducció", 0],
  ["elevator pitch", 1],
  ["selected work", 2],
  ["com ho fem", 3],
  ["sobre nosaltres", 4],
  ["validació social", 5],
  ["projectes", 6],
  ["projectes destacats", 7],
  ["inversió", 13],
  ["contacte", 14],
] as const;

const experience = [
  ["Disseny Web & Branding", "Identitats trencadores i plataformes e-commerce ultraràpides.", "Escalable"],
  ["Producció Dron 4K", "Vol urbà (RD 517/2024). AESA, ENAIRE i permisos, ho gestionem nosaltres.", "Risc Legal Zero"],
  ["IA i Automatització", "Processos repetitius automatitzats amb n8n i personatges virtuals integrats.", "Vanguardia"],
  ["Gestió d'Ajuts (Kit Digital)", "Digitalitza't a cost ZERO. Gestionem tota la paperassa amb Red.es.", "100% Subvencionat"],
  ["Social Media i Ads", "Estratègies verticals d'alta conversió (Meta/TikTok).", "ROI Real"],
  ["Producció Audiovisual", "Vídeo vertical, fotografia i peces de marca amb un acabat prèmium.", "Impacte Visual"],
];
const personalNotes = [
  "No som la típica agència de corbata, ni fem powerpoints infinits.",
  "Barregem tecnologia (IA, n8n) amb contingut fresc i plans aeris de pel·lícula.",
  "El mercat està saturat de clons. Nosaltres busquem l'impacte radical.",
  "Tu centra't en el teu negoci, nosaltres ens mengem la paperassa (AESA, Kit Digital).",
  "Som creadors, geeks de la IA i pilots. Hem vingut a fer soroll.",
];
const cases = [
  ["01", "Automatització amb IA i n8n"],
  ["02", "Webs orientades a vendes"],
  ["03", "Producció de dron 4K"],
  ["04", "Kit Digital sense burocràcia"],
];
const mediaItems = [
  ["14", "Identitat digital que trenca el patró", "Web · Branding · Catalunya"],
  ["15", "Vols urbans amb cobertura legal", "Dron 4K · AESA · ENAIRE"],
  ["16", "Automatitzacions que treballen 24/7", "IA · n8n · Negoci"],
  ["17", "Contingut vertical d'alta conversió", "Reels · TikTok · Meta"],
  ["18", "E-commerce ultraràpid", "UX · Rendiment · Vendes"],
  ["19", "Estratègia DESORDEN", "Tecnologia · Creativitat · Creixement"],
];
const logoPositions = [
  [12, 22, -8], [32, 13, 5], [54, 25, -2], [76, 14, 8],
  [18, 51, 4], [42, 43, -6], [68, 51, 3], [86, 44, -5],
  [9, 76, 7], [35, 72, -3], [61, 78, 6], [82, 69, -7],
];

function ImagePlaceholder({ number, className = "", label }: { number: string; className?: string; label?: string }) {
  return <span className={`image-placeholder ${className}`.trim()} aria-label={label ?? `Imatge substituïble ${number}`} role="img">{number}</span>;
}

function SceneFrame({ index, name, label, children }: { index: number; name: string; label: string; children: ReactNode }) {
  return (
    <section
      id={scenes[index][0]}
      className={`scene scene-${name}`}
      data-scene
      data-label={label}
      data-state={index === 0 ? "current" : "future"}
      data-distance={Math.min(index, 3)}
    >
      {children}
    </section>
  );
}

function CosmicField() {
  return (
    <div className="cosmos" aria-hidden="true">
      <div className="orbit-copy orbit-copy-a">DESCOBRIR • ORDENAR • DENOTAR •</div>
      <div className="orbit-copy orbit-copy-b">DESCOBRIR • ORDENAR • DENOTAR •</div>
      <span className="decorative-spark spark-one">✦</span>
      <span className="decorative-spark spark-two">✦</span>
      <span className="decorative-spark spark-three">✦</span>
    </div>
  );
}

export default function Home() {
  return (
    <PortfolioController sceneCount={scenes.length}>
      <CosmicField />

      <div className="media-marquee" data-media-marquee hidden aria-hidden="true">
        <p className="media-marquee__track" data-text="PROJECTES ✦ PROJECTES ✦ PROJECTES ✦ ">
          PROJECTES ✦ PROJECTES ✦ PROJECTES ✦
        </p>
      </div>

      <div className="scene-deck" aria-live="polite">
        <SceneFrame index={0} name="intro" label="introducció">
          <div className="intro-layout">
            <header className="intro-heading">
              <p className="outline-word">EL TEU</p>
              <p className="display-name">PARTNER</p>
              <p className="micro-label">( TECNOLÒGIC I CREATIU )</p>
              <ul className="hero-services" aria-label="Proposta de valor de DESORDEN">
                <li>✦ Contingut visual per a xarxes socials</li>
                <li>✦ Vídeo amb IA per visibilitzar marques i comerços</li>
                <li>✦ Creació d&apos;una identitat visual coherent</li>
              </ul>
            </header>
            <ProjectPicture
              file="media/hero/portada-chico-bn.webp"
              alt="Perfil en blanc i negre del creador i director de DESORDEN"
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
            <p className="eyebrow">Elevator pitch</p>
            <h1 id="entity-title">Passa de coordinar cinc agències alhora. Integrem Intel·ligència Artificial, disseny web i audiovisual prèmium per escalar el teu negoci a Catalunya.</h1>
            <p>Tot l&apos;arsenal que el teu negoci necessita en un sol lloc. Som Agents Digitalitzadors, Operadors UAS Certificats (AESA) i Partners de n8n.</p>
          </header>
        </SceneFrame>

        <SceneFrame index={2} name="partners" label="selected work">
          <div className="partners-copy"><p className="eyebrow">Selected work</p><h2>Imatges aèries espectaculars i desenvolupament web ultraràpid. Aquests són els projectes amb què hem trencat el mercat.</h2></div>
          <div className="logo-constellation" aria-label="Projectes seleccionats de DESORDEN">
            {logoPositions.map(([x, y, rotation], index) => {
              const number = String(index + 2).padStart(2, "0");
              return <span key={number} className="logo-position" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${rotation}deg)` }}><ImagePlaceholder className="logo-placeholder" number={number} label={`Imatge del projecte ${number} de DESORDEN`} /></span>;
            })}
          </div>
        </SceneFrame>

        <SceneFrame index={3} name="experience" label="com ho fem">
          <div className="experience-panel"><p className="ghost-statement">COM HO FEM</p><h2>Serveis</h2><div className="experience-list">
            {experience.map(([role, company, period]) => <div className="experience-row" key={role}><div><strong>{role}</strong><span>{company}</span></div><time>{period}</time></div>)}
          </div></div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="sobre nosaltres">
          <div className="about-panel"><h2>Sobre nosaltres</h2><ul>{personalNotes.map((note) => <li key={note}>✦ <span>{note}</span></li>)}</ul><p className="about-meta">Catalunya · Operem on calgui</p></div>
        </SceneFrame>

        <SceneFrame index={5} name="social-proof" label="validació social">
          <section id="social-proof" className="social-proof" aria-labelledby="social-proof-title">
            <header className="social-proof__heading">
              <p className="social-proof__eyebrow">SOCIAL PROOF</p>
              <h2 id="social-proof-title">Validat per referents del sector</h2>
              <p className="social-proof__description">Peces audiovisuals que trenquen l&apos;scroll i generen interaccions reals.</p>
            </header>
            <div className="social-proof__grid">
              <article className="social-notification" aria-label="Interacció de Rosalía">
                <img className="social-notification__avatar" src="/media/social-proof/rosalia.webp" alt="Foto de perfil de @rosalia.vt" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@rosalia.vt</strong><p>Ha interactuat amb tu per missatge directe <span>(Partida guanyada 7-6 🎾).</span></p></div>
              </article>
              <article className="social-notification" aria-label="Interacció de Rozalén">
                <img className="social-notification__avatar" src="/media/social-proof/rozalen.webp" alt="Foto de perfil de @rozalenmusic" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@rozalenmusic</strong><p>Ha compartit i comentat el teu reel: <span>“😂😂😂😂😂😂”.</span></p></div>
              </article>
              <article className="social-notification" aria-label="Interacció de Leire">
                <img className="social-notification__avatar" src="/media/social-proof/leire.webp" alt="Foto de perfil de @leiremo_oficial" width="52" height="52" loading="lazy" decoding="async" />
                <div className="social-notification__content"><strong>@leiremo_oficial</strong><p>Ha reaccionat a la teva publicació <span aria-hidden="true">❤️</span>.</p></div>
              </article>
            </div>
          </section>
        </SceneFrame>

        <SceneFrame index={6} name="cases" label="projectes">
          <div className="case-panel"><p className="eyebrow">Projectes</p><div className="case-list">
            {cases.map(([number, title]) => <button type="button" key={number} data-modal-open={title}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
          </div></div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 7} name="media" label="projectes destacats" key={number}>
            <button type="button" className="media-card" data-modal-open={title}><ImagePlaceholder number={number} className="media-placeholder" label={`Imatge destacada: ${title}`} /><span className="media-title">{title}</span><small>{meta} · OBRIR □</small></button>
          </SceneFrame>
        ))}

        <SceneFrame index={13} name="manifesto" label="inversió"><div className="manifesto-copy"><p>Els preus han de ser clars. Sense fum, sense lletra petita.</p><h2>Inverteix en creixement real.</h2><p>Des del Paquet Impuls per arrencar, fins a Domini Absolut per liderar o Desorden Total per trencar les regles. Tot és possible.</p></div></SceneFrame>
        <SceneFrame index={14} name="contact" label="contacte"><div className="contact-mark" aria-hidden="true"><i /><i /><i /></div><div className="contact-copy"><h2>FEM UN CAFÈ?</h2><p className="contact-email"><a href="mailto:hola@desorden.cat">hola@desorden.cat</a></p><p className="contact-place">CATALUNYA · ESPANYA</p><p className="contact-name">AGÈNCIA DESORDEN</p><p>Explica&apos;ns on ets i on vols arribar. Ens encanten els reptes impossibles.</p></div></SceneFrame>
      </div>

      <div className="fixed-ui">
        <header><button type="button" className="brand" data-go="0" aria-label="Torna a la introducció"><ImagePlaceholder number="00" className="brand-placeholder" label="Marca substituïble de DESORDEN" /><span>DESORDEN</span></button><p data-scene-counter>01 / 15</p></header>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Seccions de DESORDEN">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Secció</span><b data-active-label>introducció</b><i /></button>
        </nav>
        <div className="scroll-cue" data-scroll-cue><span>Desplaça&apos;t per explorar</span><i /></div>
      </div>

      <div className="modal-backdrop" data-modal role="presentation" hidden>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button type="button" className="modal-close" data-modal-close aria-label="Tanca">×</button>
          <p className="eyebrow">Detall del servei</p><h2 id="modal-title" data-modal-title>Detall del projecte</h2>
          <p>Descobreix el context, les decisions, la producció i els resultats de cada projecte DESORDEN. Els recursos multimèdia es mantenen optimitzats dins la carpeta local <code>public/media</code>.</p>
        </div>
      </div>

      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    </PortfolioController>
  );
}
