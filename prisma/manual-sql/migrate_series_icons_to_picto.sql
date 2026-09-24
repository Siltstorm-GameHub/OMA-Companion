-- Schreibt die alten Lucide-Icon-Namen von Event-Reihen und Squads in das neue Format um
-- ("pi:<icon>:<farbe>"). Die App liest alte Werte auch ohne dieses Skript richtig; es räumt nur
-- die Daten auf. Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard -> SQL Editor
-- Idempotent: nach dem ersten Lauf gibt es nichts mehr umzuschreiben.

UPDATE "EventSeries" SET "icon" = CASE "icon"
    WHEN 'Trophy' THEN 'pi:trophy-0:#f59e0b'
    WHEN 'Swords' THEN 'pi:battle:#ef4444'
    WHEN 'Gamepad2' THEN 'pi:game:#8b5cf6'
    WHEN 'Joystick' THEN 'pi:joystick:#6366f1'
    WHEN 'Crown' THEN 'pi:crown:#eab308'
    WHEN 'Medal' THEN 'pi:medal-0:#f97316'
    WHEN 'Award' THEN 'pi:award:#06b6d4'
    WHEN 'Flame' THEN 'pi:fire:#f43f5e'
    WHEN 'Star' THEN 'pi:star:#0ea5e9'
    WHEN 'Sparkles' THEN 'pi:magic:#d946ef'
    WHEN 'Zap' THEN 'pi:thunder:#84cc16'
    WHEN 'Target' THEN 'pi:target:#10b981'
    WHEN 'Shield' THEN 'pi:shield:#3b82f6'
    WHEN 'Rocket' THEN 'pi:rocket:#a855f7'
    WHEN 'Dice5' THEN 'pi:dice:#ec4899'
    WHEN 'Puzzle' THEN 'pi:puzzle:#22c55e'
    WHEN 'Heart' THEN 'pi:life:#f87171'
    WHEN 'Skull' THEN 'pi:skull:#94a3b8'
    WHEN 'Ghost' THEN 'pi:bat:#a5b4fc'
    WHEN 'Gem' THEN 'pi:gem-diamond:#22d3ee'
    WHEN 'Dumbbell' THEN 'pi:training:#ea580c'
    WHEN 'Music' THEN 'pi:music:#a78bfa'
    WHEN 'Clapperboard' THEN 'pi:movie:#fbbf24'
    WHEN 'Palette' THEN 'pi:flower:#e879f9'
  END
WHERE "icon" IN ('Trophy', 'Swords', 'Gamepad2', 'Joystick', 'Crown', 'Medal', 'Award', 'Flame', 'Star', 'Sparkles', 'Zap', 'Target', 'Shield', 'Rocket', 'Dice5', 'Puzzle', 'Heart', 'Skull', 'Ghost', 'Gem', 'Dumbbell', 'Music', 'Clapperboard', 'Palette');

UPDATE "Squad" SET "icon" = CASE "icon"
    WHEN 'Trophy' THEN 'pi:trophy-0:#f59e0b'
    WHEN 'Swords' THEN 'pi:battle:#ef4444'
    WHEN 'Gamepad2' THEN 'pi:game:#8b5cf6'
    WHEN 'Joystick' THEN 'pi:joystick:#6366f1'
    WHEN 'Crown' THEN 'pi:crown:#eab308'
    WHEN 'Medal' THEN 'pi:medal-0:#f97316'
    WHEN 'Award' THEN 'pi:award:#06b6d4'
    WHEN 'Flame' THEN 'pi:fire:#f43f5e'
    WHEN 'Star' THEN 'pi:star:#0ea5e9'
    WHEN 'Sparkles' THEN 'pi:magic:#d946ef'
    WHEN 'Zap' THEN 'pi:thunder:#84cc16'
    WHEN 'Target' THEN 'pi:target:#10b981'
    WHEN 'Shield' THEN 'pi:shield:#3b82f6'
    WHEN 'Rocket' THEN 'pi:rocket:#a855f7'
    WHEN 'Dice5' THEN 'pi:dice:#ec4899'
    WHEN 'Puzzle' THEN 'pi:puzzle:#22c55e'
    WHEN 'Heart' THEN 'pi:life:#f87171'
    WHEN 'Skull' THEN 'pi:skull:#94a3b8'
    WHEN 'Ghost' THEN 'pi:bat:#a5b4fc'
    WHEN 'Gem' THEN 'pi:gem-diamond:#22d3ee'
    WHEN 'Dumbbell' THEN 'pi:training:#ea580c'
    WHEN 'Music' THEN 'pi:music:#a78bfa'
    WHEN 'Clapperboard' THEN 'pi:movie:#fbbf24'
    WHEN 'Palette' THEN 'pi:flower:#e879f9'
  END
WHERE "icon" IN ('Trophy', 'Swords', 'Gamepad2', 'Joystick', 'Crown', 'Medal', 'Award', 'Flame', 'Star', 'Sparkles', 'Zap', 'Target', 'Shield', 'Rocket', 'Dice5', 'Puzzle', 'Heart', 'Skull', 'Ghost', 'Gem', 'Dumbbell', 'Music', 'Clapperboard', 'Palette');
