"use client";

import type { FormEvent } from "react";

const WHATSAPP_NUMBER = "34640925788";

export function ContactWhatsAppForm() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const whatsappMessage = [
      "Hola DESORDEN,",
      name ? `Nom: ${name}` : "",
      location ? `Ubicació: ${location}` : "",
      message ? `Missatge: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
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
    </form>
  );
}
