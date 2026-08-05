import { ProjectPicture } from "./ProjectPicture";

const socialProofItems = [
  {
    id: "rosalia",
    username: "@rosalia.vt",
    image: "media/social-proof/rosalia.webp",
    alt: "Foto de perfil de @rosalia.vt",
    message: "Ha interactuat amb tu per missatge directe",
    detail: "(Partida guanyada 7-6 🎾).",
  },
  {
    id: "rozalen",
    username: "@rozalenmusic",
    image: "media/social-proof/rozalen.webp",
    alt: "Foto de perfil de @rozalenmusic",
    message: "Ha compartit i comentat el teu reel:",
    detail: "“😂😂😂😂😂😂”.",
  },
  {
    id: "leire",
    username: "@leiremo_oficial",
    image: "media/social-proof/leire.webp",
    alt: "Foto de perfil de @leiremo_oficial",
    message: "Ha reaccionat a la teva publicació",
    detail: "❤️.",
  },
] as const;

export function SocialProofCards() {
  return (
    <div id="social-proof" className="social-proof" aria-labelledby="social-proof-title">
      <header className="social-proof__heading">
        <p className="social-proof__eyebrow">SOCIAL PROOF</p>
        <h2 id="social-proof-title">Validat per referents del sector</h2>
        <p className="social-proof__description">
          Peces audiovisuals que trenquen l&apos;scroll i generen interaccions reals.
        </p>
      </header>

      <div className="social-proof__grid">
        {socialProofItems.map((item) => (
          <article className="social-notification" aria-label={`Interacció de ${item.username}`} key={item.id}>
            <ProjectPicture
              file={item.image}
              alt={item.alt}
              width={52}
              height={52}
              className="social-notification__avatar"
              sizes="52px"
            />
            <div className="social-notification__content">
              <strong>{item.username}</strong>
              <p>
                {item.message} <span>{item.detail}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
