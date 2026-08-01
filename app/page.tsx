import type { ReactNode } from "react";
import { PortfolioController } from "../components/PortfolioController";

const scenes = [
  ["intro", "introduction", "intro"],
  ["pitch", "elevator pitch", "pitch"],
  ["partners", "selected work", "partners"],
  ["experience", "experience", "experience"],
  ["about", "about", "about"],
  ["numbers", "perspective", "numbers"],
  ["cases", "case studies", "cases"],
  ["media-1", "selected media", "media"],
  ["media-2", "selected media", "media"],
  ["media-3", "selected media", "media"],
  ["media-4", "selected media", "media"],
  ["media-5", "selected media", "media"],
  ["media-6", "selected media", "media"],
  ["manifesto", "manifesto", "manifesto"],
  ["contact", "let's talk", "contact"],
] as const;

const navigation = [
  ["introduction", 0],
  ["elevator pitch", 1],
  ["selected work", 2],
  ["experience", 3],
  ["about", 4],
  ["perspective", 5],
  ["case studies", 6],
  ["selected media", 7],
  ["manifesto", 13],
  ["let's talk", 14],
] as const;

const roles = ["Product", "Design", "Strategy", "Education"];
const experience = [
  ["ROLE 01", "Company or project name", "Period"],
  ["ROLE 02", "Company or project name", "Period"],
  ["ROLE 03", "Company or project name", "Period"],
  ["ROLE 04", "Company or project name", "Period"],
  ["ROLE 05", "Company or project name", "Period"],
  ["ROLE 06", "Company or project name", "Period"],
];
const personalNotes = [
  "Add one personal detail",
  "Add an interest or specialty",
  "Describe how you like to work",
  "Add your location or availability",
  "Write one memorable final note",
];
const stats: ReadonlyArray<{ label: string; value: number | null; unitText: string }> = [
  { label: "Years of professional practice", value: null, unitText: "years" },
  { label: "Projects completed", value: null, unitText: "projects" },
  { label: "Teams supported", value: null, unitText: "teams" },
  { label: "Workshops delivered", value: null, unitText: "workshops" },
  { label: "Systems created", value: null, unitText: "systems" },
  { label: "Ideas tested", value: null, unitText: "ideas" },
];
const cases = [
  ["01", "Onboarding and first-use experience"],
  ["02", "Product analytics and insight"],
  ["03", "Reusable design language"],
  ["04", "Responsible automation concept"],
];
const mediaItems = [
  ["14", "Media title 01", "Format · Language · Year"],
  ["15", "Media title 02", "Format · Language · Year"],
  ["16", "Media title 03", "Format · Language · Year"],
  ["17", "Media title 04", "Format · Language · Year"],
  ["18", "Media title 05", "Format · Language · Year"],
  ["19", "Media title 06", "Format · Language · Year"],
];
const logoPositions = [
  [12, 22, -8], [32, 13, 5], [54, 25, -2], [76, 14, 8],
  [18, 51, 4], [42, 43, -6], [68, 51, 3], [86, 44, -5],
  [9, 76, 7], [35, 72, -3], [61, 78, 6], [82, 69, -7],
];

function ImagePlaceholder({ number, className = "", label }: { number: string; className?: string; label?: string }) {
  return <span className={`image-placeholder ${className}`.trim()} aria-label={label ?? `Replaceable image ${number}`} role="img">{number}</span>;
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
      aria-hidden={index !== 0}
    >
      {children}
    </section>
  );
}

function CosmicField() {
  return (
    <div className="cosmos" aria-hidden="true">
      <div className="orbit-copy orbit-copy-a">YOUR NAME ✦ YOUR NAME ✦ YOUR NAME ✦</div>
      <div className="orbit-copy orbit-copy-b">PORTFOLIO ✦ PORTFOLIO ✦ PORTFOLIO ✦</div>
      <span className="decorative-spark spark-one">✦</span>
      <span className="decorative-spark spark-two">✦</span>
      <span className="decorative-spark spark-three">✦</span>
    </div>
  );
}

export default function Home() {
  const verifiedStats = stats.filter((stat): stat is { label: string; value: number; unitText: string } => typeof stat.value === "number");
  const numbersJsonLd = verifiedStats.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Professional experience and results in numbers",
    itemListElement: verifiedStats.map((stat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: { "@type": "QuantitativeValue", name: stat.label, value: stat.value, unitText: stat.unitText },
    })),
  } : null;

  return (
    <PortfolioController sceneCount={scenes.length}>
      <CosmicField />

      <div className="media-marquee" data-media-marquee hidden aria-hidden="true">
        <p className="media-marquee__track" data-text="TALKS & PROJECTS ✦ TALKS & PROJECTS ✦ TALKS & PROJECTS ✦ ">
          TALKS & PROJECTS ✦ TALKS & PROJECTS ✦ TALKS & PROJECTS ✦
        </p>
      </div>

      <div className="scene-deck" aria-live="polite">
        <SceneFrame index={0} name="intro" label="introduction">
          <div className="intro-layout">
            <header className="intro-heading">
              <p className="outline-word">YOUR</p>
              <p className="display-name">NAME</p>
              <p className="micro-label">( PORTFOLIO TEMPLATE )</p>
              <ul className="roles">{roles.map((role) => <li key={role}>✦ {role}</li>)}</ul>
            </header>
            <ImagePlaceholder number="01" className="hero-placeholder" label="Replaceable main portrait" />
          </div>
        </SceneFrame>

        <SceneFrame index={1} name="pitch" label="elevator pitch">
          <header className="center-copy pitch-copy">
            <p className="eyebrow">Elevator pitch</p>
            <h1 id="entity-title">YOUR NAME is a product designer and strategist who builds useful digital products for real people.</h1>
            <p>Research, experimentation, design and practical strategy are combined to create usable digital systems.</p>
          </header>
        </SceneFrame>

        <SceneFrame index={2} name="partners" label="selected work">
          <div className="partners-copy"><p className="eyebrow">Selected work</p><h2>Use this space to introduce the work you want to be known for.</h2></div>
          <div className="logo-constellation" aria-label="Replaceable project images">
            {logoPositions.map(([x, y, rotation], index) => {
              const number = String(index + 2).padStart(2, "0");
              return <span key={number} className="logo-position" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${rotation}deg)` }}><ImagePlaceholder className="logo-placeholder" number={number} label={`Replaceable project image ${number}`} /></span>;
            })}
          </div>
        </SceneFrame>

        <SceneFrame index={3} name="experience" label="experience">
          <div className="experience-panel"><p className="ghost-statement">KEEP IT BRIEF</p><h2>Experience</h2><div className="experience-list">
            {experience.map(([role, company, period]) => <div className="experience-row" key={role}><div><strong>{role}</strong><span>{company}</span></div><time>{period}</time></div>)}
          </div></div>
        </SceneFrame>

        <SceneFrame index={4} name="about" label="about">
          <div className="about-panel"><h2>About me</h2><ul>{personalNotes.map((note) => <li key={note}>✦ <span>{note}</span></li>)}</ul><p className="about-meta">Your age · Your city</p></div>
        </SceneFrame>

        <SceneFrame index={5} name="numbers" label="perspective">
          <section className="numbers-stage" aria-labelledby="numbers-title" itemScope itemType="https://schema.org/ItemList">
            <header className="numbers-heading"><p className="eyebrow">Perspective in numbers</p><h2 id="numbers-title">Professional experience and results in numbers</h2></header>
            {stats.map((stat, index) => (
              <div className={`floating-stat stat-${index + 1}`} key={stat.label} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <meta itemProp="position" content={String(index + 1)} />
                {stat.value === null ? <b aria-label="Verified value pending">—</b> : <data itemProp="value" value={String(stat.value)}>{stat.value}</data>}
                <span itemProp="name">{stat.label}</span>
                <meta itemProp="unitText" content={stat.unitText} />
              </div>
            ))}
          </section>
          {numbersJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(numbersJsonLd).replace(/</g, "\\u003c") }} /> : null}
        </SceneFrame>

        <SceneFrame index={6} name="cases" label="case studies">
          <div className="case-panel"><p className="eyebrow">Case studies</p><div className="case-list">
            {cases.map(([number, title]) => <button type="button" key={number} data-modal-open={title}><b>{number}.</b><span>{title}</span><i>↗</i></button>)}
          </div></div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => (
          <SceneFrame index={mediaIndex + 7} name="media" label="selected media" key={number}>
            <button type="button" className="media-card" data-modal-open={title}><ImagePlaceholder number={number} className="media-placeholder" /><span className="media-title">{title}</span><small>{meta} · OPEN □</small></button>
          </SceneFrame>
        ))}

        <SceneFrame index={13} name="manifesto" label="manifesto"><div className="manifesto-copy"><p>Creativity gives direction.</p><h2>Design makes it useful.</h2><p>Your process helps people get the job done.</p></div></SceneFrame>
        <SceneFrame index={14} name="contact" label="let's talk"><div className="contact-mark" aria-hidden="true"><i /><i /><i /></div><div className="contact-copy"><h2>LET&apos;S TALK</h2><p className="contact-email">your@email.com</p><p className="contact-place">YOUR CITY · YOUR COUNTRY · EARTH</p><p className="contact-name">YOUR NAME</p></div></SceneFrame>
      </div>

      <div className="fixed-ui">
        <header><button type="button" className="brand" data-go="0" aria-label="Go to the first scene"><ImagePlaceholder number="00" className="brand-placeholder" label="Replaceable brand mark" /><span>YOUR PORTFOLIO</span></button><p data-scene-counter>01 / 15</p></header>
        <div className="progress-rail" aria-hidden="true"><i data-progress-bar /></div>
        <nav className="section-navigation" aria-label="Portfolio sections">
          <ol data-section-menu hidden>{navigation.map(([label, index]) => <li key={label}><button type="button" data-go={index}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol>
          <button type="button" className="section-toggle" data-menu-toggle aria-expanded="false"><span>Section</span><b data-active-label>introduction</b><i /></button>
        </nav>
        <div className="scroll-cue" data-scroll-cue><span>Scroll to explore</span><i /></div>
      </div>

      <div className="modal-backdrop" data-modal role="presentation" hidden>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button type="button" className="modal-close" data-modal-close aria-label="Close">×</button>
          <p className="eyebrow">Editable detail</p><h2 id="modal-title" data-modal-title>Project detail</h2>
          <p>Replace this neutral description with your own context, decisions, role and outcome. Keep future media inside the local <code>public/media</code> folder.</p>
        </div>
      </div>

      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    </PortfolioController>
  );
}
