import type { Metadata } from "next";
import { CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";

export const metadata: Metadata = {
  title: "Preus i paquets de serveis",
  description: "Paquets de web, contingut vertical, dron, publicitat i automatització adaptats a comerços i empreses de Catalunya.",
  alternates: { canonical: "/preus" },
};

const packages = [
  {
    name: "Impuls Digital",
    badge: "Ideal per arrencar",
    price: "A partir de [X] € / mes",
    description: "Presència sòlida i contingut que converteix.",
    features: [
      "Manteniment web bàsic",
      "Gestió d'una xarxa social",
      "4 vídeos en format vertical al mes",
      "Informe mensual",
    ],
    cta: "Contractar Impuls",
  },
  {
    name: "Domini Absolut",
    badge: "El més popular",
    price: "A partir de [X] € / mes",
    description: "Quan estar present no és suficient i vols liderar el sector.",
    features: [
      "Web o e-commerce avançat",
      "8 vídeos verticals al mes",
      "1 vol amb dron fins a 4K cada trimestre",
      "Campanyes Ads a Meta o TikTok",
      "Automatització bàsica de processos",
    ],
    cta: "Vull liderar el meu sector",
    featured: true,
  },
  {
    name: "Desorden Total",
    badge: "A mida",
    price: "Pressupost a mida",
    description: "L'arsenal tecnològic complet. Fem realitat l'impossible.",
    features: [
      "Assistents virtuals amb IA 24/7",
      "Personatges creats amb IA integrats en entorns reals",
      "Vídeos FPV d'alta velocitat",
      "Automatitzacions complexes amb n8n",
      "Direcció d'art prèmium",
    ],
    cta: "Sol·licitar pressupost",
  },
];

export default function PricingPage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="Preus"
        title="Preus clars. Sense fum, sense lletra petita."
        subtitle="Inverteix en creixement real. Tria el nivell d'intensitat que el projecte necessita: des de comerços locals fins a empreses que volen trencar el mercat."
        primaryCta={{ href: "#paquets", label: "Comparar paquets" }}
        secondaryCta={{ href: "#contacte", label: "Demanar proposta a mida" }}
      />

      <CommercialSection
        id="paquets"
        eyebrow="Paquets"
        title="Tria el nivell de DESORDEN que necessita el teu negoci."
        intro="Els imports marcats amb [X] estan pendents de validació comercial abans de publicar aquesta pàgina a producció."
      >
        <div className="pricing-grid">
          {packages.map((item) => (
            <article className={`pricing-card${item.featured ? " pricing-card--featured" : ""}`} key={item.name}>
              <p className="pricing-card__badge">{item.badge}</p>
              <h2>{item.name}</h2>
              <p className="pricing-card__price">{item.price}</p>
              <p className="pricing-card__description">{item.description}</p>
              <ul>
                {item.features.map((feature) => <li key={feature}>✦ <span>{feature}</span></li>)}
              </ul>
              <a className="commercial-button commercial-button--primary" href={`https://wa.me/34640925788?text=${encodeURIComponent(`Hola DESORDEN, m'interessa el paquet ${item.name}.`)}`}>{item.cta}</a>
            </article>
          ))}
        </div>
      </CommercialSection>

      <CommercialSection
        eyebrow="Avís important"
        title="El teu projecte podria encaixar en una línia d'ajut?"
        intro="Alguns serveis digitals poden ser subvencionables quan existeix una convocatòria oberta i el negoci compleix els requisits. Ho comprovem abans de pressupostar o prometre cap cobertura."
        className="commercial-section--contrast commercial-section--compact"
      >
        <a className="commercial-inline-link" href="/ajuts">Consultar la pàgina d'ajuts →</a>
      </CommercialSection>

      <CommercialCta
        title="No encaixes en cap paquet? Millor."
        text="Explica'ns l'objectiu, els canals i el ritme de producció que necessites. Prepararem una proposta amb abast, calendari i prioritats."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20una%20proposta%20a%20mida%20per%20al%20meu%20projecte."
        label="Sol·licitar pressupost"
      />
    </main>
  );
}
