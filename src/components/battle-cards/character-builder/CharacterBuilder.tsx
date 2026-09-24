"use client";

// ============================================
// Character-Builder: Körper, Outfit, Farben, Hautton wählen (für die eigene
// Community-Karte, siehe MyCardEditor.tsx)
// ============================================
// Der 3D-Baukasten selbst (Canvas/Skelett/Teile) ist reine Anzeige — Zustand
// und Persistenz laufen komplett hier: `onChange` feuert bei jeder Änderung
// mit der vollständigen CharacterConfig, MyCardEditor entscheidet, wann/ob
// das gespeichert wird. Die Animationswahl ist reine Vorschau (nicht Teil der
// gespeicherten Config) — sie steuert nur, welche Bewegung man beim Anpassen sieht.

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { loadCharacterManifest, defaultConfigFor, carryConfigOver, bodyOf } from "@/lib/character-kit/manifest";
import type { CharacterConfig, CharacterManifest, Gender } from "@/lib/character-kit/types";
import CharacterCanvas from "./CharacterCanvas";

const GENDER_LABEL: Record<Gender, string> = { male: "Männlich", female: "Weiblich" };

function Swatch({ color, active, onClick, title }: { color: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-6 h-6 rounded-md border-2 transition-transform shrink-0"
      style={{ background: color, borderColor: active ? "#5eead4" : "rgba(255,255,255,0.15)", transform: active ? "scale(1.08)" : undefined }}
    />
  );
}

export default function CharacterBuilder({
  initialConfig,
  onChange,
}: {
  initialConfig: CharacterConfig | null;
  onChange: (config: CharacterConfig) => void;
}) {
  const [manifest, setManifest] = useState<CharacterManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CharacterConfig | null>(null);
  const [animationClipName, setAnimationClipName] = useState<string | null>(null);

  useEffect(() => {
    loadCharacterManifest()
      .then((m) => {
        setManifest(m);
        const initial = initialConfig ?? defaultConfigFor(m, "male", Object.keys(m.genders.male.bodies)[0]);
        setConfig(initial);
        const clips = m.genders[initial.gender].animations.clips;
        setAnimationClipName(clips.find((c) => /^idle/i.test(c.id))?.name ?? clips[0]?.name ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Charakter-Daten konnten nicht geladen werden."));
    // initialConfig wird bewusst nur beim ersten Laden übernommen (kein erneutes Überschreiben
    // bei Reparent/Re-Render der Elternkomponente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(next: CharacterConfig) {
    setConfig(next);
    onChange(next);
  }

  const body = manifest && config ? bodyOf(manifest, config.gender, config.body) : null;
  const partsByCategory = useMemo(() => {
    if (!body) return {};
    const map: Record<string, typeof body.parts> = {};
    for (const p of body.parts) (map[p.category] ??= []).push(p);
    for (const list of Object.values(map)) list.sort((a, b) => a.index - b.index);
    return map;
  }, [body]);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!manifest || !config || !body) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Charakter-Baukasten lädt…
      </div>
    );
  }
  const genderData = manifest.genders[config.gender];
  const skinBlocks = genderData.materials[body.bodyMaterial].blocks.filter((b) => b.row === body.skin.row);

  function setGender(gender: Gender) {
    const wantsBody = config!.body in manifest!.genders[gender].bodies ? config!.body : Object.keys(manifest!.genders[gender].bodies)[0];
    update(carryConfigOver(manifest!, config!, gender, wantsBody));
    const clips = manifest!.genders[gender].animations.clips;
    setAnimationClipName(clips.find((c) => /^idle/i.test(c.id))?.name ?? clips[0]?.name ?? null);
  }

  function setBody(bodyId: string) {
    update(carryConfigOver(manifest!, config!, config!.gender, bodyId));
  }

  function setPart(category: string, partId: string) {
    update({ ...config!, parts: { ...config!.parts, [category]: partId || null } });
  }

  function setTint(category: string, blockIndex: number) {
    update({ ...config!, tints: { ...config!.tints, [category]: blockIndex } });
  }

  function setSkin(blockIndex: number) {
    update({ ...config!, skinBlock: blockIndex });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-4 items-start">
      <div className="aspect-[3/4] rounded-xl overflow-hidden">
        <CharacterCanvas genderData={genderData} config={config} animationClipName={animationClipName} />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-gray-500">Geschlecht</span>
            <Select className="mt-1 w-full" value={config.gender} onChange={(e) => setGender(e.target.value as Gender)}>
              {(Object.keys(manifest.genders) as Gender[]).map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Statur</span>
            <Select className="mt-1 w-full" value={config.body} onChange={(e) => setBody(e.target.value)}>
              {Object.entries(genderData.bodies).map(([id, b]) => (
                <option key={id} value={id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {genderData.categories.map((cat) => {
          const options = partsByCategory[cat] ?? [];
          if (options.length === 0) return null;
          const selectedId = config.parts[cat] ?? "";
          const selectedPart = options.find((p) => p.id === selectedId);
          return (
            <div key={cat}>
              <label className="block">
                <span className="text-xs text-gray-500">{cat}</span>
                <Select className="mt-1 w-full" value={selectedId} onChange={(e) => setPart(cat, e.target.value)}>
                  <option value="">— keine —</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </label>
              {selectedPart?.tintable && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {genderData.materials[selectedPart.materials[0]].blocks.map((b, i) => (
                    <Swatch
                      key={i}
                      color={b.rgb}
                      title={b.rgb}
                      active={(config.tints[cat] ?? selectedPart.swatches[0]) === i}
                      onClick={() => setTint(cat, i)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div>
          <span className="text-xs text-gray-500">Hautton</span>
          <div className="flex gap-1.5 mt-1.5">
            {skinBlocks.map((b, i) => {
              const globalIndex = genderData.materials[body.bodyMaterial].blocks.indexOf(b);
              return (
                <Swatch
                  key={i}
                  color={b.rgb}
                  title={b.rgb}
                  active={(config.skinBlock ?? body.skin.block) === globalIndex}
                  onClick={() => setSkin(globalIndex)}
                />
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-gray-500">Bewegung (nur Vorschau)</span>
          <Select className="mt-1 w-full" value={animationClipName ?? ""} onChange={(e) => setAnimationClipName(e.target.value)}>
            {genderData.animations.clips.map((c) => (
              <option key={c.name} value={c.name}>
                {c.id}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
