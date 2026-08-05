import type { ReactNode } from "react";

type Cta = {
  href: string;
  label: string;
};

type CommercialHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
};

type CommercialSectionProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  id?: string;
  className?: string;
};

type CommercialCardProps = {
  index?: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function CommercialHero({ eyebrow, title, subtitle, primaryCta, secondaryCta }: CommercialHeroProps) {
  return (
    <section className="commercial-hero">
      <div className="commercial-hero__glow" aria-hidden="true" />
      <div className="commercial-hero__content">
        <p className="commercial-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="commercial-hero__subtitle">{subtitle}</p>
        <div className="commercial-actions">
          <a className="commercial-button commercial-button--primary" href={primaryCta.href}>{primaryCta.label}</a>
          {secondaryCta && (
            <a className="commercial-button commercial-button--secondary" href={secondaryCta.href}>{secondaryCta.label}</a>
          )}
        </div>
      </div>
      <p className="commercial-hero__mark" aria-hidden="true">DESORDEN</p>
    </section>
  );
}

export function CommercialSection({ eyebrow, title, intro, children, id, className = "" }: CommercialSectionProps) {
  return (
    <section id={id} className={`commercial-section ${className}`.trim()}>
      <header className="commercial-section__heading">
        {eyebrow && <p className="commercial-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

export function CommercialCard({ index, title, description, children, className = "" }: CommercialCardProps) {
  return (
    <article className={`commercial-card ${className}`.trim()}>
      {index && <span className="commercial-card__index">{index}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </article>
  );
}

export function CommercialCta({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <section className="commercial-final-cta" id="contacte">
      <p className="commercial-eyebrow">Parlem</p>
      <h2>{title}</h2>
      <p>{text}</p>
      <a className="commercial-button commercial-button--primary" href={href}>{label}</a>
    </section>
  );
}
