import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateWhatsAppMessage, generateWhatsAppUrl } from "../components/whatsappMessage.ts";

describe("generateWhatsAppMessage", () => {
  it("should generate full message when all fields are filled", () => {
    assert.equal(
      generateWhatsAppMessage("Jules", "Paris", "Hello!"),
      "Hola DESORDEN,\nNom: Jules\nUbicació: Paris\nMissatge: Hello!"
    );
  });

  it("should omit missing fields", () => {
    assert.equal(
      generateWhatsAppMessage("", "", "Only message"),
      "Hola DESORDEN,\nMissatge: Only message"
    );
  });

  it("should handle empty form", () => {
    assert.equal(
      generateWhatsAppMessage("", "", ""),
      "Hola DESORDEN,"
    );
  });
});

describe("generateWhatsAppUrl", () => {
  it("should generate correct URL", () => {
    assert.equal(
      generateWhatsAppUrl("Jules", "Paris", "Hello!"),
      "https://wa.me/34640925788?text=Hola%20DESORDEN%2C%0ANom%3A%20Jules%0AUbicaci%C3%B3%3A%20Paris%0AMissatge%3A%20Hello!"
    );
  });
});
