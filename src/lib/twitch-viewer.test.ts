import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { sealSession, unsealSession, safeReturnTo } from "./twitch-viewer";

// Der Schlüssel wird erst beim Ver-/Entschlüsseln gelesen.
process.env.AUTH_SECRET ??= "test-secret-for-viewer-cookie";

const session = { userId: "1", login: "nova", displayName: "Nova", accessToken: "at", refreshToken: "rt", expiresAt: 123 };

describe("Twitch-Login für Zuschauer", () => {
  test("Cookie: verschlüsselt hin und zurück, Klartext-Token nicht lesbar", () => {
    const sealed = sealSession(session);
    assert.ok(!sealed.includes("accessToken") && !Buffer.from(sealed.split(".")[2], "base64url").toString().includes("nova"), "Inhalt nicht im Klartext");
    assert.deepEqual(unsealSession(sealed), session);
  });

  test("manipuliertes oder kaputtes Cookie = abgemeldet", () => {
    const sealed = sealSession(session);
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
    assert.equal(unsealSession(tampered), null);
    assert.equal(unsealSession("quatsch"), null);
    assert.equal(unsealSession(undefined), null);
  });

  test("Rücksprung nur auf Pfade innerhalb der App", () => {
    assert.equal(safeReturnTo("/zusammen?c=a,b"), "/zusammen?c=a,b");
    assert.equal(safeReturnTo("https://evil.example"), "/zusammen");
    assert.equal(safeReturnTo("//evil.example"), "/zusammen");
    assert.equal(safeReturnTo("/\\evil.example"), "/zusammen");
    assert.equal(safeReturnTo(null), "/zusammen");
  });
});
