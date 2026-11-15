import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMMENT_LOCK_AFTER_END_MS, NOTIFY_BUNDLE_MS, commentLockAt, normalizeCommentInput, parseCommentSegments,
  plainCommentText, sanitizeLateMin, shouldNotifyBundled, statusMessage,
} from "./event-comments-shared";

const MENTION = "[@Scarz](user:abcdefghij123)";

test("plainCommentText ersetzt Erwähnungs-Tokens durch @Name", () => {
  assert.equal(plainCommentText(`Hi ${MENTION}, bis gleich`), "Hi @Scarz, bis gleich");
});

test("parseCommentSegments trennt Text, Erwähnungen und Links", () => {
  const segs = parseCommentSegments(`Lobby: https://example.com/x. ${MENTION} kommst du?`);
  assert.deepEqual(segs, [
    { type: "text", text: "Lobby: " },
    { type: "link", href: "https://example.com/x" },
    { type: "text", text: ". " },
    { type: "mention", name: "Scarz", userId: "abcdefghij123" },
    { type: "text", text: " kommst du?" },
  ]);
});

test("normalizeCommentInput kürzt Leerzeilen und trimmt", () => {
  assert.equal(normalizeCommentInput("  a\r\n\r\n\r\n\r\nb  "), "a\n\nb");
});

test("sanitizeLateMin: Standard 15, Obergrenze 240", () => {
  assert.equal(sanitizeLateMin(undefined), 15);
  assert.equal(sanitizeLateMin("30"), 30);
  assert.equal(sanitizeLateMin(9999), 240);
});

test("statusMessage", () => {
  assert.match(statusMessage("late", 5), /5 Minuten/);
  assert.match(statusMessage("absent"), /Kann doch nicht/);
});

test("commentLockAt: nur beendete Events, 48 h nach Ende", () => {
  const end = new Date("2026-01-01T20:00:00Z");
  assert.equal(commentLockAt({ status: "open", endedAt: end }), null);
  assert.equal(commentLockAt({ status: "finished", endedAt: end })!.getTime(), end.getTime() + COMMENT_LOCK_AFTER_END_MS);
});

test("shouldNotifyBundled: höchstens alle 30 min, nicht bei aktivem Leser", () => {
  const now = new Date("2026-01-01T20:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  assert.equal(shouldNotifyBundled(null, now), true);
  assert.equal(shouldNotifyBundled({ lastReadAt: ago(30_000), lastNotifiedAt: null }, now), false);
  assert.equal(shouldNotifyBundled({ lastReadAt: ago(3_600_000), lastNotifiedAt: ago(10 * 60_000) }, now), false);
  assert.equal(shouldNotifyBundled({ lastReadAt: ago(3_600_000), lastNotifiedAt: ago(NOTIFY_BUNDLE_MS) }, now), true);
});
