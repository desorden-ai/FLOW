import type { Metadata } from "next";
import { CommercialCard, CommercialCta, CommercialHero, CommercialSection } from "../../components/CommercialBlocks";

export const metadata: Metadata = {
  title: "Sobre nosaltres",
  description: "DESORDEN és una agència creativa i tecnològica de Catalunya especialitzada en IA, automatització, web, contingut vertical i producció amb dron.",
  alternates: { canonical: "/sobre-nosaltres" },
};

const values = [
  {
    title: "Zero burocràcia per a tu",
    description: "Coordinem els tràmits de vol aplicables i la documentació dels projectes d'ajuts. Tu et concentres en el negoci i nosaltres ordenem l'execució.",
  },
  {
    title: "Innovació real",
    description: "No parlem d'IA per quedar bé. La integrem en automatitzacions, processos i continguts que aporten una diferència visible.",
  },
  {
    title: "Orientats a la conversió",
    description: "Fem que les coses siguin potents visualment, però sobretot construïm webs, campanyes i continguts perquè generin negoci.",
  },
];

export default function AboutPage() {
  return (
    <main className="commercial-page">
      <CommercialHero
        eyebrow="Sobre DESORDEN"
        title="Benvinguts a Desorden. Venim a posar ordre al teu caos digital."
        subtitle="No som la típica agència de corbata ni fem presentacions infinites. Som creadors, obsessius de la IA i pilots de drons. Hem vingut a fer soroll."
        primaryCta={{ href: "#filosofia", label: "Conèixer la nostra filosofia" }}
        secondaryCta={{ href: "#contacte", label: "Parlar del teu projecte" }}
      />

      <CommercialSection
        id="filosofia"
        eyebrow="La nostra filosofia"
        title="Per què escollir-nos? Perquè no fem allò que fan els altres."
        className="commercial-section--story"
      >
        <div className="commercial-story">
          <p>El mercat està saturat de contingut clònic. Mires deu webs de la competència i totes semblen iguals. A DESORDEN creiem que, per destacar avui, necessites un impacte radical.</p>
          <p>Ho fem barrejant tecnologia aplicada —automatitzacions, intel·ligència artificial i personatges virtuals— amb la frescor del format vertical que consumeixen els usuaris a TikTok i Instagram.</p>
          <p>I hi afegim producció audiovisual i plans aeris amb dron, estudiant cada operació i la normativa aplicable amb el mateix rigor que posem en la direcció creativa.</p>
        </div>
      </CommercialSection>

      <CommercialSection
        eyebrow="Els valors"
        title="Creativitat, tecnologia i execució sota una mateixa direcció."
        className="commercial-section--contrast"
      >
        <div className="commercial-grid commercial-grid--three">
          {values.map((value, index) => (
            <CommercialCard
              index={String(index + 1).padStart(2, "0")}
              title={value.title}
              description={value.description}
              key={value.title}
            />
          ))}
        </div>
      </CommercialSection>

      <CommercialCta
        title="Fem un cafè i li donem una volta al teu negoci?"
        text="Explica'ns on ets i on vols arribar. Ens encanten els reptes impossibles."
        href="https://wa.me/34640925788?text=Hola%20DESORDEN%2C%20vull%20agendar%20una%20videotrucada%20per%20parlar%20del%20meu%20negoci."
        label="Agendar videotrucada"
      />
    </main>
  );
}
