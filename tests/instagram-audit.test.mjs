import assert from "node:assert/strict";
import test from "node:test";
import {
  createInstagramAudit,
  normalizeInstagramUsername,
} from "../lib/instagram-audit.ts";

test("normalitza usuaris i URLs d'Instagram", () => {
  assert.equal(normalizeInstagramUsername(" @Desorden.Cat "), "desorden.cat");
  assert.equal(
    normalizeInstagramUsername("https://www.instagram.com/desorden.cat/"),
    "desorden.cat",
  );
  assert.equal(normalizeInstagramUsername("https://example.com/desorden.cat"), null);
  assert.equal(normalizeInstagramUsername("usuari amb espais"), null);
});

test("calcula mètriques sense substituir zeros per dades inventades", () => {
  const result = createInstagramAudit(
    {
      username: "negoci.local",
      followersCount: 1000,
      biography: "Reserva directament a https://example.com",
      latestPosts: [
        { likesCount: 0, commentsCount: 0, type: "Image" },
        { likesCount: 20, commentsCount: 5, productType: "clips" },
      ],
    },
    "negoci.local",
    "2026-08-06T00:00:00.000Z",
  );

  assert.equal(result.engagementRate, 1.25);
  assert.equal(result.videoRatio, 50);
  assert.equal(result.hasCta, true);
  assert.equal(result.postsAnalyzed, 2);
});

test("marca els perfils privats com a no auditables", () => {
  assert.throws(
    () => createInstagramAudit({ username: "privat", private: true }, "privat"),
    /PRIVATE_PROFILE/,
  );
});
