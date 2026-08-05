import type { Metadata } from "next";
import { CommercialCard, CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";
import { GrantCalculator } from "../../components/GrantCalculator";

export const metadata: Metadata = {
  title: "Ajuts a la digitalització i Kit Digital",
  description: "Diagnosi d'ajuts, preparació documental i implementació de web, comerç electrònic i xarxes socials per a empreses i autònoms.",
  alternates: { canonical: "/ajuts" },
};

const solutions = [
  {
    title: "Lloc web i presència bàsica",
    description: "Disseny responsive, arquitectura clara, SEO essencial i una identitat que no sembli una plantilla genèrica.",
  },
  {
    title: "Comerç electrònic",
    description: "E-commerce amb mètodes de pagament integrats, estructura de conversió i una experiència preparada per vendre.",
  },
  {
    title: "Gestió de xarxes socials",
    description: "Pla editorial, producció vertical i publicacions pensades per transformar visibilitat en demanda real.",
  },
];

export default function GrantsPage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="Ajuts i digitalització"
        title="Prepara la teva empresa per aprofitar els ajuts digitals disponibles."
        subtitle="Analitzem la teva situació, detectem convocatòries aplicables i transformem l'ajut en una web, un e-commerce o una estratègia de contingut útil de veritat."
        primaryCta={{ href: "#calculadora", label: "Consultar imports de referència" }}
        secondaryCta={{ href: "#gestio", label: "Veure què gestionem" }}
      />

      <CommercialSection
        id="calculadora"
        eyebrow="Calculadora informativa"
        title="Quins imports contemplava el Kit Digital segons la mida de l'empresa?"
        intro="Selecciona la mida de la plantilla. El resultat és informatiu i no confirma que hi hagi una convocatòria oberta ni que l'empresa sigui beneficiària."
      >
        <GrantCalculator />
        <div className="commercial-status-note">
          <strong>Estat del programa:</strong>
          <p>Les convocatòries publicades del Kit Digital consten com a tancades. Abans d&apos;iniciar cap tràmit comprovarem si existeix una convocatòria nova, una ampliació o un altre ajut compatible.</p>
        </div>
      </CommercialSection>

      <CommercialSection
        id="gestio"
        eyebrow="Gestió documental i solucions"
        title="Tu centra't en el negoci. Nosaltres ordenem la paperassa i la implementació."
        intro="Quan hi ha una línia d'ajut aplicable, coordinem l'anàlisi de requisits, la documentació, la implantació tècnica i la justificació del servei dins dels terminis exigits."
        className="commercial-section--contrast"
      >
        <div className="commercial-grid commercial-grid--three">
          {solutions.map((solution, index) => (
            <CommercialCard
              index={String(index + 1).padStart(2, "0")}
              title={solution.title}
              description={solution.description}
              key={solution.title}
            />
          ))}
        </div>
      </CommercialSection>

      <CommercialCta
        title="Vols saber quins ajuts pots demanar ara?"
        text="Farem una primera diagnosi de mida, activitat, ubicació i objectiu digital abans de prometre imports o subvencions."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20una%20diagnosi%20d%27ajuts%20per%20digitalitzar%20el%20meu%20negoci."
        label="Sol·licitar diagnosi d'ajuts"
      />
    </main>
  );
}
