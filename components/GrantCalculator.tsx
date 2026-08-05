"use client";

import { useState } from "react";

const segments = {
  segment3: {
    label: "De 0 a menys de 3 empleats (inclou autònoms)",
    amount: "3.000 €",
  },
  segment2: {
    label: "De 3 a menys de 10 empleats",
    amount: "6.000 €",
  },
  segment1: {
    label: "De 10 a menys de 50 empleats",
    amount: "12.000 €",
  },
} as const;

type SegmentKey = keyof typeof segments;

export function GrantCalculator() {
  const [segment, setSegment] = useState<SegmentKey>("segment3");
  const selected = segments[segment];

  return (
    <div className="grant-calculator">
      <label htmlFor="company-size">Selecciona la mida de la teva plantilla</label>
      <select
        id="company-size"
        value={segment}
        onChange={(event) => setSegment(event.target.value as SegmentKey)}
      >
        {Object.entries(segments).map(([value, item]) => (
          <option value={value} key={value}>{item.label}</option>
        ))}
      </select>

      <div className="grant-calculator__result" aria-live="polite">
        <span>Import màxim de referència del bo</span>
        <strong>{selected.amount}</strong>
        <p>Import històric del programa Kit Digital per a aquest segment, subjecte a bases, elegibilitat i convocatòria vigent.</p>
      </div>
    </div>
  );
}
