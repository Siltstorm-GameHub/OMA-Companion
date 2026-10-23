import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseIrcLine, splitEmotes, toChatMessage, toRemoval, applyRemoval, appendMessage } from "./twitch-irc";
import { groupBySameGame } from "./watch-together-groups";

const PRIVMSG = "@badge-info=;color=#1E90FF;display-name=Nova\\sStrike;emotes=25:6-10;id=abc-1;room-id=111 :novastrike!novastrike@novastrike.tmi.twitch.tv PRIVMSG #pixelpaul :hallo Kappa GG";

describe("Gemeinsamer Chat: Twitch-Zeilen auswerten", () => {
  test("PRIVMSG mit Tags, Anzeigename und Emote", () => {
    const m = toChatMessage(parseIrcLine(PRIVMSG)!)!;
    assert.equal(m.channel, "pixelpaul");
    assert.equal(m.user, "Nova Strike", "\\s im Tag = Leerzeichen");
    assert.equal(m.userLogin, "novastrike");
    assert.equal(m.color, "#1E90FF");
    assert.deepEqual(m.parts, [{ type: "text", text: "hallo " }, { type: "emote", id: "25", name: "Kappa" }, { type: "text", text: " GG" }]);
  });

  test("Emote-Positionen zählen Unicode-Zeichen (Emoji davor)", () => {
    assert.deepEqual(splitEmotes("😀 Kappa", "25:2-6"), [{ type: "text", text: "😀 " }, { type: "emote", id: "25", name: "Kappa" }]);
    assert.deepEqual(splitEmotes("nur Text", undefined), [{ type: "text", text: "nur Text" }]);
  });

  test("/me-Nachricht und PING", () => {
    const m = toChatMessage(parseIrcLine(":a!a@a PRIVMSG #b :\u0001ACTION winkt\u0001")!)!;
    assert.equal(m.action, true);
    assert.deepEqual(m.parts, [{ type: "text", text: "winkt" }]);
    assert.equal(parseIrcLine("PING :tmi.twitch.tv")!.command, "PING");
  });

  test("Moderation: gelöschte Nachricht, Timeout, geleerter Chat", () => {
    const a = toChatMessage(parseIrcLine("@id=1 :x!x@x PRIVMSG #ch1 :eins")!)!;
    const b = toChatMessage(parseIrcLine("@id=2 :y!y@y PRIVMSG #ch1 :zwei")!)!;
    const c = toChatMessage(parseIrcLine("@id=3 :x!x@x PRIVMSG #ch2 :drei")!)!;
    const list = [a, b, c];
    assert.deepEqual(applyRemoval(list, toRemoval(parseIrcLine("@target-msg-id=2 :tmi.twitch.tv CLEARMSG #ch1 :zwei")!)!).map(m => m.id), ["1", "3"]);
    assert.deepEqual(applyRemoval(list, toRemoval(parseIrcLine(":tmi.twitch.tv CLEARCHAT #ch1 :x")!)!).map(m => m.id), ["2", "3"], "Timeout gilt nur im Kanal");
    assert.deepEqual(applyRemoval(list, toRemoval(parseIrcLine(":tmi.twitch.tv CLEARCHAT #ch1")!)!).map(m => m.id), ["3"]);
  });

  test("Shared Chat: dieselbe Nachricht aus zwei Kanälen nur einmal", () => {
    const m1 = toChatMessage(parseIrcLine("@id=a1;source-id=src9 :x!x@x PRIVMSG #ch1 :hi")!)!;
    const m2 = toChatMessage(parseIrcLine("@id=b1;source-id=src9 :x!x@x PRIVMSG #ch2 :hi")!)!;
    assert.equal(appendMessage(appendMessage([], m1), m2).length, 1);
    const many = Array.from({ length: 5 }, (_, i) => toChatMessage(parseIrcLine(`@id=${i} :x!x@x PRIVMSG #c :${i}`)!)!);
    assert.deepEqual(many.reduce((acc, m) => appendMessage(acc, m, 3), [] as typeof many).map(m => m.id), ["2", "3", "4"]);
  });
});

describe("Zusammen ansehen: Gruppen nach Spiel", () => {
  test("gleiches Spiel (grob abgeglichen) landet in einer Gruppe", () => {
    const groups = groupBySameGame([
      { n: "a", game: "Rocket League" }, { n: "b", game: "EA SPORTS FC 25" }, { n: "c", game: "rocket league" },
      { n: "d", game: null }, { n: "e", game: "EA Sports FC" },
    ]);
    assert.deepEqual(groups.map(g => g.map(x => x.n)), [["a", "c"], ["b", "e"], ["d"]]);
  });
});
