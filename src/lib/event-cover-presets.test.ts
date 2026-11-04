import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_COVER_PRESETS, allowedCoverUrl, isPresetCover, sanitizeCoverUrl } from "./event-cover-presets";

describe("sanitizeCoverUrl", () => {
  test("Vorlagen und https-URLs sind erlaubt", () => {
    for (const p of EVENT_COVER_PRESETS) assert.equal(sanitizeCoverUrl(p.url), p.url);
    assert.equal(sanitizeCoverUrl(" https://x.public.blob.vercel-storage.com/event-cover/a.jpg "), "https://x.public.blob.vercel-storage.com/event-cover/a.jpg");
  });
  test("alles andere wird verworfen", () => {
    assert.equal(sanitizeCoverUrl("http://example.com/a.jpg"), null);
    assert.equal(sanitizeCoverUrl("javascript:alert(1)"), null);
    assert.equal(sanitizeCoverUrl("/event-covers/../secret.jpg"), null);
    assert.equal(sanitizeCoverUrl(""), null);
    assert.equal(sanitizeCoverUrl(42), null);
  });
});

describe("allowedCoverUrl", () => {
  const preset = EVENT_COVER_PRESETS[0].url;
  const own = "https://x.public.blob.vercel-storage.com/event-cover/a.jpg";
  test("Mods dürfen Vorlagen und eigene Bilder setzen", () => {
    assert.equal(allowedCoverUrl(preset, true), preset);
    assert.equal(allowedCoverUrl(own, true), own);
  });
  test("normale User nur Vorlagen", () => {
    assert.equal(allowedCoverUrl(preset, false), preset);
    assert.equal(allowedCoverUrl(own, false), null);
    assert.equal(isPresetCover("/event-covers/gibts-nicht.svg"), false);
  });
});
