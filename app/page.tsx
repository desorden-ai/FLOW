"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const sections = [
  "intro",
  "pitch",
  "projects",
  "background",
  "numbers",
  "case studies",
  "media",
  "manifesto",
  "contact",
];

const roles = ["Product", "Design", "Strategy", "Education"];

const experience = [
  ["ROLE 01", "Company or project name", "Period"],
  ["ROLE 02", "Company or project name", "Period"],
  ["ROLE 03", "Company or project name", "Period"],
  ["ROLE 04", "Company or project name", "Period"],
  ["ROLE 05", "Company or project name", "Period"],
];

const personalNotes = [
  "Write a short personal note here",
  "Add an interest or specialty",
  "Describe how you like to work",
  "Add your location or availability",
];

const stats = [
  ["--", "metric placeholder 01"],
  ["--", "metric placeholder 02"],
  ["--", "metric placeholder 03"],
  ["--", "metric placeholder 04"],
  ["--", "metric placeholder 05"],
  ["--", "metric placeholder 06"],
  ["--", "metric placeholder 07"],
];

const cases = [
  {
    title: "Case study title 01",
    meta: "Project category · Year",
    body: "Replace this paragraph with a concise explanation of the problem, your approach and the result. Keep it clear, specific and easy to scan.",
    details: ["Your role", "Project scope", "Key learning"],
  },
  {
    title: "Case study title 02",
    meta: "Project category · Year",
    body: "Use this space to explain the decisions behind the work. The template intentionally contains no client names, evidence claims or external links.",
    details: ["Your role", "Project scope", "Key learning"],
  },
  {
    title: "Case study title 03",
    meta: "Project category · Year",
    body: "Add the story of a project here. You can keep this modal text-only or extend it later with your own locally hosted media.",
    details: ["Your role", "Project scope", "Key learning"],
  },
  {
    title: "Case study title 04",
    meta: "Project category · Year",
    body: "This neutral copy is ready to be replaced. All visual slots are numbered so you can find them quickly in the replacement guide.",
    details: ["Your role", "Project scope", "Key learning"],
  },
];

const mediaItems = [
  ["14", "Media title 01", "Format · Year"],
  ["15", "Media title 02", "Format · Year"],
  ["16", "Media title 03", "Format · Year"],
  ["17", "Media title 04", "Format · Year"],
  ["18", "Media title 05", "Format · Year"],
  ["19", "Media title 06", "Format · Year"],
];

type ModalState =
  | { kind: "case"; index: number }
  | { kind: "media"; index: number }
  | null;

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

export default function Home() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const wheelLock = useRef(false);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    setActive(Math.max(0, Math.min(sections.length - 1, next)));
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
        setMenuOpen(false);
        return;
      }
      if (modal) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        setActive((value) => Math.min(sections.length - 1, value + 1));
      }
      if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        setActive((value) => Math.max(0, value - 1));
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(sections.length - 1);
    };

    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, modal]);

  const onWheel = (event: React.WheelEvent) => {
    if (modal || wheelLock.current || Math.abs(event.deltaY) < 12) return;
    wheelLock.current = true;
    setActive((value) =>
      Math.max(0, Math.min(sections.length - 1, value + (event.deltaY > 0 ? 1 : -1))),
    );
    window.setTimeout(() => (wheelLock.current = false), 650);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null || modal) return;
    const currentY = event.changedTouches[0]?.clientY ?? touchStart.current;
    const delta = touchStart.current - currentY;
    if (Math.abs(delta) > 45) goTo(active + (delta > 0 ? 1 : -1));
    touchStart.current = null;
  };

  const modalCase = modal?.kind === "case" ? cases[modal.index] : null;
  const modalMedia = modal?.kind === "media" ? mediaItems[modal.index] : null;

  return (
    <main
      className="site-shell"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        "--scene-offset": `${active * -100}vh`,
        "--star-a-x": `${active * -18}px`,
        "--star-a-y": `${active * 16}px`,
        "--star-a-z": `${active * 22}px`,
        "--star-b-x": `${active * 28}px`,
        "--star-b-y": `${active * -20}px`,
        "--flight-one-x": `${active * -10}vw`,
        "--flight-two-x": `${active * 8}vw`,
        "--fog-one-x": `${active * 5}vw`,
        "--fog-two-x": `${active * -6}vw`,
      } as React.CSSProperties}
    >
      <div className="starfield" aria-hidden="true">
        <i className="stars stars-a" />
        <i className="stars stars-b" />
        <i className="flight-line flight-one">PORTFOLIO ✦ TEMPLATE ✦ PORTFOLIO ✦</i>
        <i className="flight-line flight-two">TEMPLATE ✦ PORTFOLIO ✦ TEMPLATE ✦</i>
        <i className="fog fog-one" />
        <i className="fog fog-two" />
      </div>

      <div className="scenes">
        <section className="scene intro-scene" aria-hidden={active !== 0}>
          <div className="intro-copy">
            <p className="outline-name">YOUR</p>
            <h1>NAME</h1>
            <p className="alias">( ALIAS )</p>
            <ul className="role-list">
              {roles.map((role) => <li key={role}>{role}</li>)}
            </ul>
          </div>
          <div className="portrait-card">
            <ImagePlaceholder number="01" label="Replaceable hero portrait" />
          </div>
        </section>

        <section className="scene pitch-scene" aria-hidden={active !== 1}>
          <p className="eyebrow">Elevator pitch</p>
          <h2>Write your main value proposition here.</h2>
          <p>Explain what you do, who you help and how your approach is different.</p>
        </section>

        <section className="scene decade-scene" aria-hidden={active !== 2}>
          <h2>Selected collaborators, projects or areas of expertise</h2>
          <div className="logo-cloud" aria-label="Replaceable project images">
            {Array.from({ length: 12 }, (_, index) => {
              const number = String(index + 2).padStart(2, "0");
              return <ImagePlaceholder key={number} number={number} className="logo-placeholder" />;
            })}
          </div>
        </section>

        <section className="scene story-scene" aria-hidden={active !== 3}>
          <h2>Your background</h2>
          <div className="story-columns">
            <article>
              <h3>Experience</h3>
              {experience.map(([title, company, period]) => (
                <div className="timeline-row" key={title}>
                  <div><strong>{title}</strong><p>{company}</p></div>
                  <time>{period}</time>
                </div>
              ))}
            </article>
            <article>
              <h3>About you</h3>
              <ul className="facts-list">
                {personalNotes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="scene numbers-scene" aria-hidden={active !== 4}>
          <p className="eyebrow">Optional section</p>
          <h2>Your numbers</h2>
          <div className="stats-grid">
            {stats.map(([number, label]) => (
              <div className="stat" key={label}><b>{number}</b><span>{label}</span></div>
            ))}
          </div>
        </section>

        <section className="scene cases-scene" aria-hidden={active !== 5}>
          <p className="eyebrow">Click to expand</p>
          <h2>Case studies</h2>
          <div className="project-list">
            {cases.map((item, index) => (
              <button key={item.title} onClick={() => setModal({ kind: "case", index })}>
                <b>{index + 1}.</b><span>{item.title}</span><i>+</i>
              </button>
            ))}
          </div>
        </section>

        <section className="scene talks-scene" aria-hidden={active !== 6}>
          <p className="eyebrow">Replaceable media</p>
          <h2>Selected media</h2>
          <div className="talks-track">
            {mediaItems.map((item, index) => (
              <button key={item[0]} onClick={() => setModal({ kind: "media", index })}>
                <ImagePlaceholder number={item[0]} className="media-placeholder" />
                <span>{item[1]}</span><small>{item[2]}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="scene manifesto-scene" aria-hidden={active !== 7}>
          <p>Use this first line to frame your point of view.</p>
          <h2>Your manifesto<br />belongs here.</h2>
          <p>Keep it short. Make it personal.<br />Say what guides your decisions.<br />Give visitors a reason to remember you.</p>
        </section>

        <section className="scene contact-scene" aria-hidden={active !== 8}>
          <p className="eyebrow">Open to meaningful conversations</p>
          <h2>LET’S TALK</h2>
          <p className="contact-address">your@email.com</p>
          <p>Your city · Your country</p>
        </section>
      </div>

      <div className="overlay-ui">
        <header>
          <button className="brand" onClick={() => goTo(0)} aria-label="Go to the first section">
            <ImagePlaceholder number="00" className="brand-placeholder" label="Replaceable brand mark" />
            <span>YOUR PORTFOLIO</span>
          </button>
          <span className="status">portfolio template</span>
        </header>
        <div className="progress-track" aria-hidden="true">
          <span style={{ height: `${((active + 1) / sections.length) * 100}%` }} />
        </div>
        <nav className="section-nav" aria-label="Portfolio sections">
          {menuOpen && (
            <ol>
              {sections.map((section, index) => (
                <li key={section}>
                  <button className={index === active ? "active" : ""} onClick={() => goTo(index)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>{section}
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button className="section-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            section <b>{sections[active]}</b><i className={menuOpen ? "open" : ""} />
          </button>
        </nav>
        {active === 0 && <div className="scroll-hint"><span>scroll to explore</span><i /></div>}
      </div>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={modalCase?.title ?? modalMedia?.[1]} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
            {modalCase && (
              <>
                <p className="modal-index">{String(modal.index + 1).padStart(2, "0")}</p>
                <h2>{modalCase.title}</h2><p className="modal-meta">{modalCase.meta}</p>
                <p className="modal-body">{modalCase.body}</p>
                <ul>{modalCase.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              </>
            )}
            {modalMedia && (
              <>
                <ImagePlaceholder number={modalMedia[0]} className="modal-placeholder" />
                <h2>{modalMedia[1]}</h2><p className="modal-meta">{modalMedia[2]}</p>
                <p className="modal-body">Replace this square with your own local image or media component.</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </main>
  );
}
