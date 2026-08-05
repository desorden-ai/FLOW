import type { Metadata } from "next";
import { CommercialCard, CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";

export const metadata: Metadata = {
  title: "Intel·ligència artificial i automatització",
  description: "Automatització de processos amb n8n, integracions, assistents virtuals i contingut generat amb intel·ligència artificial.",
  alternates: { canonical: "/ia-automatitzacio" },
};

const applications = [
  {
    title: "Processos repetitius",
    description: "Connectem formularis, correu, CRM, bases de dades i eines internes perquè la informació circuli sense tasques manuals innecessàries.",
  },
  {
    title: "Assistents i agents",
    description: "Dissenyem assistents virtuals per atendre, classificar consultes, preparar informació i activar fluxos amb supervisió humana.",
  },
  {
    title: "IA aplicada a contingut",
    description: "Creem personatges i recursos visuals amb IA i els integrem en peces reals mantenint una direcció artística coherent.",
  },
];

export default function AutomationPage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="IA i automatització"
        title="Menys tasques repetitives. Més temps per fer créixer el negoci."
        subtitle="Automatitzem processos amb n8n i apliquem intel·ligència artificial allà on aporta velocitat, capacitat o una experiència millor per al client."
        primaryCta={{ href: "#contacte", label: "Sol·licitar auditoria de processos" }}
        secondaryCta={{ href: "#aplicacions", label: "Veure aplicacions" }}
      />

      <CommercialSection
        id="aplicacions"
        eyebrow="Aplicacions"
        title="Automatització útil, explicable i connectada amb les eines que ja utilitzes."
      >
        <div className="commercial-grid commercial-grid--three">
          {applications.map((item, index) => (
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
        title="Quin procés et roba més hores cada setmana?"
        text="Explica'ns com funciona ara. Identificarem colls d'ampolla, riscos i una primera automatització amb impacte mesurable."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20auditar%20un%20proc%C3%A9s%20per%20automatitzar-lo."
        label="Auditar el meu procés"
      />
    </main>
  );
}
