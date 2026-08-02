"use client";

import { useEffect } from "react";

const notifications = [
  { username: "rosalia.vt", message: "li ha agradat el teu reel." },
  { username: "rozalenmusic", message: "li ha agradat el teu reel." },
  { username: "leiremo_oficial", message: "li ha agradat el teu reel." },
] as const;

function createVerifiedBadge(documentRef: Document) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = documentRef.createElementNS(namespace, "svg");
  svg.setAttribute("class", "ig-inline-badge");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Compte verificat");
  svg.setAttribute("focusable", "false");

  const badge = documentRef.createElementNS(namespace, "path");
  badge.setAttribute("fill", "currentColor");
  badge.setAttribute(
    "d",
    "M12 1.75 14.2 3.2l2.6-.28.92 2.45 2.45.92-.28 2.6L21.35 12l-1.46 2.2.28 2.6-2.45.92-.92 2.45-2.6-.28L12 21.35l-2.2-1.46-2.6.28-.92-2.45-2.45-.92.28-2.6L2.65 12l1.46-2.2-.28-2.6 2.45-.92.92-2.45 2.6.28L12 1.75Z",
  );

  const check = documentRef.createElementNS(namespace, "path");
  check.setAttribute("fill", "#fff");
  check.setAttribute("d", "m9.85 15.55-3.2-3.2 1.45-1.45 1.75 1.75 6.05-6.05 1.45 1.45-7.5 7.5Z");

  svg.append(badge, check);
  return svg;
}

export function SocialProofEnhancer() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>("#social-proof");
    const grid = section?.querySelector<HTMLElement>(".social-proof__grid");

    if (!section || !grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".social-notification"));

    cards.forEach((card, index) => {
      const notification = notifications[index];
      const content = card.querySelector<HTMLElement>(".social-notification__content");
      const username = content?.querySelector<HTMLElement>("strong");
      const message = content?.querySelector<HTMLParagraphElement>("p");

      if (!notification || !content || !username || !message) return;

      card.classList.add("instagram-notification");
      card.setAttribute("aria-label", `A ${notification.username} li ha agradat el teu reel`);
      content.dataset.instagramReady = "true";

      content.querySelectorAll(".verified-badge, .ig-inline-badge, .ig-prefix").forEach((node) => node.remove());

      const prefix = document.createElement("span");
      prefix.className = "ig-prefix";
      prefix.textContent = "A ";

      username.textContent = notification.username;
      username.before(prefix);
      username.after(createVerifiedBadge(document));

      message.textContent = notification.message;
      message.className = "ig-notification-copy";
    });

    const scene = section.closest<HTMLElement>("[data-scene]");
    const reveal = () => grid.classList.add("is-visible");

    if (scene?.dataset.state === "current") reveal();

    const sceneObserver = scene
      ? new MutationObserver(() => {
          if (scene.dataset.state === "current") reveal();
        })
      : null;

    sceneObserver?.observe(scene as HTMLElement, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) reveal();
          },
          { threshold: 0.2 },
        )
      : null;

    intersectionObserver?.observe(section);

    return () => {
      sceneObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, []);

  return null;
}
