import type { Metadata } from "next";
import { CommercialCard, CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";

export const metadata: Metadata = {
  title: "Drons i producció audiovisual a Catalunya",
  description: "Producció audiovisual aèria 4K/8K, planificació de vol, permisos i postproducció per a marques, indústria, turisme i immobiliari.",
  alternates: { canonical: "/drons" },
};

const benefits = [
  {
    title: "Qualitat cinematogràfica",
    description: "Flota DJI d'última generació i sensors estabilitzats per aconseguir plans dinàmics, fluids i preparats per a campanyes, xarxes i peces corporatives.",
  },
  {
    title: "Planificació legal integral",
    description: "Analitzem l'espai aeri i preparem les comunicacions o coordinacions aplicables amb AESA, ENAIRE, Interior i altres organismes segons el tipus d'operació.",
  },
  {
    title: "Servei clau en mà",
    description: "Ens ocupem de l'estratègia de vol, la gravació, l'edició, el ritme narratiu per a cada canal i l'etalonatge final.",
  },
];

const projects = [
  "Seguiment d'obra industrial i civil.",
  "Espots publicitaris per al sector turístic i immobiliari.",
  "Vol immersiu FPV d'alta velocitat: l'adrenalina de la teva marca.",
];

export default function DronePage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="Drons i audiovisual"
        title="Producció audiovisual aèria a Catalunya amb planificació legal integral."
        subtitle="Gravació en 4K/8K per a campanyes publicitàries, promoció immobiliària i indústria. Capturem allò difícil mentre gestionem la planificació i la documentació de l'operació."
        primaryCta={{ href: "#contacte", label: "Consultar viabilitat de vol" }}
        secondaryCta={{ href: "#portafolis", label: "Veure aplicacions" }}
      />

      <CommercialSection
        eyebrow="El valor diferencial"
        title="Imatges espectaculars sense improvisar la seguretat ni la normativa."
        intro="Cada projecte comença amb una anàlisi real de localització, espai aeri, equip, permisos i objectiu audiovisual."
      >
        <div className="commercial-grid commercial-grid--three">
          {benefits.map((benefit, index) => (
            <CommercialCard
              index={String(index + 1).padStart(2, "0")}
              title={benefit.title}
              description={benefit.description}
              key={benefit.title}
            />
          ))}
        </div>
        <p className="commercial-legal-note">Les operacions UAS s'estudien cas per cas d'acord amb la normativa aplicable, inclòs el Reial decret 517/2024 i la regulació europea vigent.</p>
      </CommercialSection>

      <CommercialSection
        id="portafolis"
        eyebrow="Portafolis de projectes"
        title="Tres maneres de canviar la percepció de la teva marca."
        className="commercial-section--contrast"
      >
        <div className="commercial-project-list">
          {projects.map((project, index) => (
            <article key={project}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{project}</h3>
            </article>
          ))}
        </div>
      </CommercialSection>

      <CommercialCta
        title="Tens una localització o una idea de vol?"
        text="Envia'ns la ubicació, la data aproximada i l'objectiu del projecte. Et direm què és viable i quin plantejament audiovisual té més sentit."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20consultar%20la%20viabilitat%20d%27un%20vol%20amb%20dron."
        label="Consultar el meu projecte"
      />
    </main>
  );
}
