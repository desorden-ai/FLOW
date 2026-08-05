import type { Metadata } from "next";
import { CommercialCard, CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";

export const metadata: Metadata = {
  title: "Disseny web i branding orientats a vendes",
  description: "Identitat visual, webs corporatives i e-commerce ràpids, accessibles i dissenyats per convertir visites en oportunitats.",
  alternates: { canonical: "/disseny-web" },
};

const pillars = [
  {
    title: "Identitat que es recorda",
    description: "Construïm una direcció visual coherent, diferencial i adaptable a web, xarxes, campanyes i peces audiovisuals.",
  },
  {
    title: "Experiència orientada a conversió",
    description: "Ordenem missatges, jerarquia, navegació i crides a l'acció perquè el visitant entengui ràpidament què ofereixes i què ha de fer.",
  },
  {
    title: "Rendiment i base tècnica",
    description: "Desenvolupem experiències responsive, accessibles, ràpides i preparades per treballar SEO, analítica i integracions.",
  },
];

export default function WebDesignPage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="Disseny web & branding"
        title="Una web que no només impressiona. Una web que ajuda a vendre."
        subtitle="Creem identitats visuals trencadores i plataformes corporatives o e-commerce ràpides, accessibles i connectades amb els objectius comercials del negoci."
        primaryCta={{ href: "#contacte", label: "Sol·licitar auditoria web" }}
        secondaryCta={{ href: "#metode", label: "Veure el plantejament" }}
      />

      <CommercialSection
        id="metode"
        eyebrow="El plantejament"
        title="Estratègia, disseny i tecnologia treballant en la mateixa direcció."
      >
        <div className="commercial-grid commercial-grid--three">
          {pillars.map((item, index) => (
            <CommercialCard
              index={String(index + 1).padStart(2, "0")}
              title={item.title}
              description={item.description}
              key={item.title}
            />
          ))}
        </div>
      </CommercialSection>

      <CommercialCta
        title="La teva web actual explica bé per què t'han d'escollir?"
        text="Revisarem missatge, jerarquia, conversió, rendiment i coherència visual per prioritzar els canvis que poden tenir més impacte."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20una%20auditoria%20de%20la%20meva%20web."
        label="Auditar la meva web"
      />
    </main>
  );
}
