/**
 * Turns the verified keyword cues of a long scenario into visual requirement chips
 * (signaling principle: highlight what decides the answer, cut reading load).
 */
import type { GameIconName } from "@/components/game/icons";

export interface Chip {
  icon: GameIconName;
  label: string;
}

const RULES: [RegExp, Chip][] = [
  [/everyone|whole team|teammates|clones? the repo|shared|commit(ted)? to the repo|checked in/i, { icon: "mesh-network", label: "Para todo el equipo" }],
  [/only (you|your|for you)|your own|personal|your machine|not (be )?committed|other projects|without affecting/i, { icon: "plain-padlock", label: "Solo tú / local" }],
  [/never|block|prevent|must not|secret|.env|credential|deny|without giving/i, { icon: "checked-shield", label: "Seguridad" }],
  [/every time|always|deterministic|guarantee|automatically|regardless/i, { icon: "cycle", label: "Siempre, determinista" }],
  [/CI|pipeline|script|headless|non-interactive|cron|scheduled|unattended/i, { icon: "cog", label: "Automatización" }],
  [/context|tokens?|cost|cheaper|compact|long session/i, { icon: "coins", label: "Contexto y costo" }],
  [/least setup|fewest steps|simplest|quickest|without installing|minimal/i, { icon: "focused-lightning", label: "Mínimo esfuerzo" }],
  [/parallel|at the same time|isolat|worktree|separate branch/i, { icon: "stack", label: "En paralelo" }],
];

export function chipsFor(cues: string[], stem = ""): Chip[] {
  const text = `${cues.join(" | ")} ${stem.slice(-300)}`;
  const out: Chip[] = [];
  for (const [re, chip] of RULES) {
    if (re.test(text) && !out.some((c) => c.label === chip.label)) out.push(chip);
    if (out.length === 4) break;
  }
  return out;
}

/** Split a stem into plain and highlighted parts for the given cue phrases (case-insensitive). */
export function highlight(stem: string, cues: string[]): { text: string; hit: boolean }[] {
  const phrases = cues.map((c) => c.trim()).filter((c) => c.length >= 3).sort((a, b) => b.length - a.length);
  if (!phrases.length) return [{ text: stem, hit: false }];
  const re = new RegExp(`(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return stem.split(re).filter(Boolean).map((text) => ({ text, hit: phrases.some((p) => p.toLowerCase() === text.toLowerCase()) }));
}
