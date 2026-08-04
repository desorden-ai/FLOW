export const WHATSAPP_NUMBER = "34640925788";

export function generateWhatsAppMessage(name: string, location: string, message: string): string {
  return [
    "Hola DESORDEN,",
    name ? `Nom: ${name}` : "",
    location ? `Ubicació: ${location}` : "",
    message ? `Missatge: ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateWhatsAppUrl(name: string, location: string, message: string): string {
  const whatsappMessage = generateWhatsAppMessage(name, location, message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
}
