"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SceneKind =
  | "intro"
  | "pitch"
  | "partners"
  | "experience"
  | "about"
  | "numbers"
  | "cases"
  | "media"
  | "manifesto"
  | "contact";

type SceneDefinition = {
  id: string;
  label: string;
  kind: SceneKind;
  mediaIndex?: number;
};

const scenes: SceneDefinition[] = [
  { id: "intro", label: "introduction", kind: "intro" },
  { id: "pitch", label: "elevator pitch", kind: "pitch" },
  { id: "partners", label: "selected work", kind: "partners" },
  { id: "experience", label: "experience", kind: "experience" },
  { id: "about", label: "about", kind: "about" },
  { id: "numbers", label: "perspective", kind: "numbers" },
  { id: "cases", label: "case studies", kind: "cases" },
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `media-${index + 1}`,
    label: "selected media",
    kind: "media" as const,
    mediaIndex: index,
  })),
  { id: "manifesto", label: "manifesto", kind: "manifesto" },
  { id: "contact", label: "let's talk", kind: "contact" },
];

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

const stats = [
  ["00", "years of practice"],
  ["--", "projects completed"],
  ["XX", "teams supported"],
  ["00", "workshops delivered"],
  ["--", "systems created"],
  ["XX", "ideas tested"],
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

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  depth: number;
  delay: number;
  glow: boolean;
  cross: boolean;
};

function makeStars(count: number): Star[] {
  let seed = 94731;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, (_, index) => {
    const depth = 0.25 + random() * 1.75;
    const glow = index % 17 === 0 || random() > 0.94;
    return {
      x: random() * 100,
      y: random() * 100,
      size: glow ? 3 + random() * 7 : 0.7 + random() * 2.2,
      opacity: 0.22 + random() * 0.76,
      depth,
      delay: random() * -8,
      glow,
      cross: index % 43 === 0,
    };
  });
}

const starData = makeStars(210);

function ImagePlaceholder({
  number,
  className = "",
  label,
}: {
  number: string;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`image-placeholder ${className}`.trim()}
      aria-label={label ?? `Replaceable image ${number}`}
      role="img"
    >
      {number}
    </span>
  );
}

function CosmicField({ active }: { active: number }) {
  return (
    <div className="cosmos" aria-hidden="true">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="stars-layer">
        {starData.map((star, index) => {
          const travel = active * star.depth;
          return (
            <i
              className={`cosmic-star${star.glow ? " is-glow" : ""}${star.cross ? " is-cross" : ""}`}
              key={index}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDelay: `${star.delay}s`,
                transform: `translate3d(${travel * -2.6}px, ${travel * 8.5}px, 0) scale(${1 + travel * 0.008})`,
              }}
            />
          );
        })}
      </div>
      <div className="orbit-copy orbit-copy-a">YOUR NAME ✦ YOUR NAME ✦ YOUR NAME ✦</div>
      <div className="orbit-copy orbit-copy-b">PORTFOLIO ✦ PORTFOLIO ✦ PORTFOLIO ✦</div>
      <span className="decorative-spark spark-one">✦</span>
      <span className="decorative-spark spark-two">✦</span>
      <span className="decorative-spark spark-three">✦</span>
    </div>
  );
}

function SceneFrame({
  index,
  active,
  name,
  children,
}: {
  index: number;
  active: number;
  name: string;
  children: React.ReactNode;
}) {
  const distance = index - active;
  const state = distance === 0 ? "current" : distance < 0 ? "past" : "future";
  return (
    <section
      className={`scene scene-${name}`}
      data-state={state}
      data-distance={Math.min(Math.abs(distance), 3)}
      aria-hidden={distance !== 0}
    >
      {children}
    </section>
  );
}

export default function Home() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const wheelLock = useRef(false);
  const touchStart = useRef<number | null>(null);

  const activeScene = scenes[active];
  const progress = active / (scenes.length - 1);

  const goTo = useCallback((next: number) => {
    setActive(Math.max(0, Math.min(scenes.length - 1, next)));
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalTitle(null);
        setMenuOpen(false);
        return;
      }
      if (modalTitle) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        setActive((value) => Math.min(scenes.length - 1, value + 1));
      }
      if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        setActive((value) => Math.max(0, value - 1));
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(scenes.length - 1);
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, modalTitle]);

  const onWheel = (event: React.WheelEvent) => {
    if (modalTitle || wheelLock.current || Math.abs(event.deltaY) < 12) return;
    wheelLock.current = true;
    setActive((value) =>
      Math.max(0, Math.min(scenes.length - 1, value + (event.deltaY > 0 ? 1 : -1))),
    );
    window.setTimeout(() => (wheelLock.current = false), 560);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null || modalTitle) return;
    const currentY = event.changedTouches[0]?.clientY ?? touchStart.current;
    const delta = touchStart.current - currentY;
    if (Math.abs(delta) > 42) goTo(active + (delta > 0 ? 1 : -1));
    touchStart.current = null;
  };

  const mediaSceneIndexes = useMemo(
    () => scenes.map((scene, index) => scene.kind === "media" ? index : -1).filter((index) => index >= 0),
    [],
  );

  return (
    <main
      className="site-shell"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        "--progress": progress,
        "--orbit-a-x": `${active * -7.5}vw`,
        "--orbit-b-x": `${active * 5.2}vw`,
        "--nebula-a-x": `${active * 1.8}vw`,
        "--nebula-b-x": `${active * -1.3}vw`,
      } as React.CSSProperties}
    >
      <CosmicField active={active} />

      <div className="scene-deck" aria-live="polite">
        <SceneFrame index={0} active={active} name="intro">
          <div className="intro-layout">
            <div className="intro-heading">
              <p className="outline-word">YOUR</p>
              <h1>NAME</h1>
              <p className="micro-label">( PORTFOLIO TEMPLATE )</p>
              <ul className="roles">
                {roles.map((role) => <li key={role}>✦ {role}</li>)}
              </ul>
            </div>
            <ImagePlaceholder number="01" className="hero-placeholder" label="Replaceable main portrait" />
          </div>
        </SceneFrame>

        <SceneFrame index={1} active={active} name="pitch">
          <div className="center-copy pitch-copy">
            <p className="eyebrow">Elevator pitch</p>
            <h2>I build useful products for real people.</h2>
            <p>Through research, experiments, design, common sense — and your own point of view.</p>
          </div>
        </SceneFrame>

        <SceneFrame index={2} active={active} name="partners">
          <div className="partners-copy">
            <p className="eyebrow">Selected work</p>
            <h2>Use this space to introduce the work you want to be known for.</h2>
          </div>
          <div className="logo-constellation" aria-label="Replaceable project images">
            {logoPositions.map(([x, y, rotation], index) => {
              const number = String(index + 2).padStart(2, "0");
              return (
                <span
                  key={number}
                  className="logo-position"
                  style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${rotation}deg)` }}
                >
                  <ImagePlaceholder
                    className="logo-placeholder"
                    number={number}
                    label={`Replaceable project image ${number}`}
                  />
                </span>
              );
            })}
          </div>
        </SceneFrame>

        <SceneFrame index={3} active={active} name="experience">
          <div className="experience-panel">
            <p className="ghost-statement">KEEP IT BRIEF</p>
            <h2>Experience</h2>
            <div className="experience-list">
              {experience.map(([role, company, period]) => (
                <div className="experience-row" key={role}>
                  <div><strong>{role}</strong><span>{company}</span></div>
                  <time>{period}</time>
                </div>
              ))}
            </div>
          </div>
        </SceneFrame>

        <SceneFrame index={4} active={active} name="about">
          <div className="about-panel">
            <h2>About me</h2>
            <ul>
              {personalNotes.map((note) => <li key={note}>✦ <span>{note}</span></li>)}
            </ul>
            <p className="about-meta">Your age · Your city</p>
          </div>
        </SceneFrame>

        <SceneFrame index={5} active={active} name="numbers">
          <div className="numbers-stage">
            <p className="eyebrow">Perspective in numbers</p>
            {stats.map(([number, label], index) => (
              <div className={`floating-stat stat-${index + 1}`} key={label}>
                <b>{number}</b><span>{label}</span>
              </div>
            ))}
          </div>
        </SceneFrame>

        <SceneFrame index={6} active={active} name="cases">
          <div className="case-panel">
            <p className="eyebrow">Case studies</p>
            <div className="case-list">
              {cases.map(([number, title]) => (
                <button key={number} onClick={() => setModalTitle(title)}>
                  <b>{number}.</b><span>{title}</span><i>↗</i>
                </button>
              ))}
            </div>
          </div>
        </SceneFrame>

        {mediaItems.map(([number, title, meta], mediaIndex) => {
          const sceneIndex = mediaSceneIndexes[mediaIndex];
          return (
            <SceneFrame index={sceneIndex} active={active} name="media" key={number}>
              <button className="media-card" onClick={() => setModalTitle(title)}>
                <ImagePlaceholder number={number} className="media-placeholder" />
                <span className="media-title">{title}</span>
                <small>{meta} · OPEN □</small>
              </button>
              <p className="media-ghost">TALKS & PROJECTS</p>
            </SceneFrame>
          );
        })}

        <SceneFrame index={13} active={active} name="manifesto">
          <div className="manifesto-copy">
            <p>Creativity gives direction.</p>
            <h2>Design makes it useful.</h2>
            <p>Your process helps people get the job done.</p>
          </div>
        </SceneFrame>

        <SceneFrame index={14} active={active} name="contact">
          <div className="contact-mark" aria-hidden="true"><i /><i /><i /></div>
          <div className="contact-copy">
            <h2>LET&apos;S TALK</h2>
            <p className="contact-email">your@email.com</p>
            <p className="contact-place">YOUR CITY · YOUR COUNTRY · EARTH</p>
            <p className="contact-name">YOUR NAME</p>
          </div>
        </SceneFrame>
      </div>

      <div className="fixed-ui">
        <header>
          <button className="brand" onClick={() => goTo(0)} aria-label="Go to the first scene">
            <ImagePlaceholder number="00" className="brand-placeholder" label="Replaceable brand mark" />
            <span>YOUR PORTFOLIO</span>
          </button>
          <p>{String(active + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}</p>
        </header>

        <div className="progress-rail" aria-hidden="true">
          <i style={{ top: `calc(${progress * 100}% - ${progress * 76}px)` }} />
        </div>

        <nav className="section-navigation" aria-label="Portfolio sections">
          {menuOpen && (
            <ol>
              {navigation.map(([label, index]) => (
                <li key={label}>
                  <button className={activeScene.label === label ? "active" : ""} onClick={() => goTo(index)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>{label}
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button className="section-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            <span>Section</span><b>{activeScene.label}</b><i className={menuOpen ? "open" : ""} />
          </button>
        </nav>

        {active === 0 && <div className="scroll-cue"><span>Scroll to explore</span><i /></div>}
      </div>

      {modalTitle && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalTitle(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={modalTitle} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalTitle(null)} aria-label="Close">×</button>
            <p className="eyebrow">Editable detail</p>
            <h2>{modalTitle}</h2>
            <p>Replace this neutral description with your own context, decisions, role and outcome. Keep any future media inside the local <code>public/media</code> folder.</p>
          </div>
        </div>
      )}

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </main>
  );
}
