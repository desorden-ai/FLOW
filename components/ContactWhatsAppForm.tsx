"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { WHATSAPP_NUMBER, generateWhatsAppUrl } from "./whatsappMessage";

const WHATSAPP_LABEL = "+34 640 92 57 88";
const INSTAGRAM_HANDLE = "@desorden.cat";
const INSTAGRAM_URL = "https://www.instagram.com/desorden.cat/";

export function ContactWhatsAppForm() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.querySelector<HTMLElement>("#contact"));
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const url = generateWhatsAppUrl(name, location, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!portalTarget) return null;

  return createPortal(
    <div className="contact-form-shell">
      <form className="contact-form" onSubmit={handleSubmit} aria-label="Formulari de contacte per WhatsApp">
        <h2>CONTACTE</h2>

        <label className="contact-field">
          <span>NOM</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            aria-label="Nom"
          />
        </label>

        <label className="contact-field">
          <span>UBICACIÓ</span>
          <input
            type="text"
            name="location"
            autoComplete="address-level2"
            required
            aria-label="Ubicació"
          />
        </label>

        <label className="contact-field contact-field--message">
          <span>MISSATGE</span>
          <textarea
            name="message"
            rows={5}
            required
            aria-label="Missatge"
          />
        </label>

        <button type="submit" className="contact-submit" aria-label="Contactar per WhatsApp">
          ENVIAR PER WHATSAPP
        </button>

        <div className="contact-direct-links" aria-label="Canals de contacte directes">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
            {WHATSAPP_LABEL}
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            {INSTAGRAM_HANDLE}
          </a>
        </div>
      </form>
    </div>,
    portalTarget,
  );
}
