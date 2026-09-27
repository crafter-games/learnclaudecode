"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { play } from "@/lib/game/sfx";
import { GameIcon } from "./icons";

type Option = { id: string; text: string };
type Phase = "answering" | "wrong" | "revealed";

/**
 * "Ordena": tap the items in order; each tap appends, tapping a placed item removes it and
 * everything after it (so fixing a mistake is one tap). The sequence lives in `selected`.
 */
export function OrderInput({
  options,
  selected,
  setSelected,
  phase,
  correctIds,
}: {
  options: Option[];
  selected: string[];
  setSelected: (s: string[]) => void;
  phase: Phase;
  correctIds: string[];
}) {
  const reduce = useReducedMotion();
  const revealed = phase === "revealed";
  function tap(id: string) {
    if (revealed) return;
    play("tap");
    const at = selected.indexOf(id);
    setSelected(at >= 0 ? selected.slice(0, at) : [...selected, id]);
  }
  const shown = revealed ? correctIds.map((id) => options.find((o) => o.id === id)!).filter(Boolean) : options;
  return (
    <div className="space-y-2.5">
      {!revealed && <p className="text-center text-[0.9em] font-extrabold text-white">Toca en orden, del primero al último</p>}
      {shown.map((o, i) => {
        const pos = revealed ? i : selected.indexOf(o.id);
        const placed = pos >= 0;
        return (
          <motion.button
            key={o.id}
            layout={!reduce}
            onClick={() => tap(o.id)}
            className={`press flex min-h-14 w-full items-center gap-3 rounded-2xl border-[3px] border-ink px-4 py-3 text-left shadow-[0_5px_0_var(--ink)] ${
              revealed ? "bg-green text-white" : placed ? "bg-card" : "bg-card-2"
            }`}
          >
            <span
              className={`display flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-ink text-[1.1em] ${
                placed ? "bg-yellow text-ink" : "bg-white text-muted"
              }`}
            >
              {placed ? pos + 1 : ""}
            </span>
            <span className="flex-1 font-extrabold leading-snug">{o.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** "Completa el comando": free recall of a command, flag or key, typed in a terminal-looking field. */
export function CommandInput({
  value,
  setValue,
  phase,
  answerText,
}: {
  value: string;
  setValue: (v: string) => void;
  phase: Phase;
  answerText: string | null;
}) {
  const revealed = phase === "revealed";
  return (
    <div className="space-y-2.5">
      <label className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-[#1c1840] px-4 py-3 font-mono text-[1.05em] text-white shadow-[0_5px_0_var(--ink)]">
        <span aria-hidden className="text-yellow">
          &gt;
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => {
            // Confidence is part of the answer: Enter only closes the keyboard.
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={revealed}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Tu respuesta"
          placeholder="escribe aquí"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/40"
        />
      </label>
      {revealed && answerText && (
        <p className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-green px-4 py-3 font-mono text-[1.05em] font-bold text-white">
          <GameIcon name="check-mark" size={18} /> {answerText}
        </p>
      )}
    </div>
  );
}

/**
 * "Arma la config": a config file with blanks. Tap a blank, then pick its value from the chips.
 * `selected` holds one option id per slot, in slot order ("" while empty).
 */
export function ConfigInput({
  template,
  slots,
  options,
  selected,
  setSelected,
  phase,
  correctIds,
  firstPick,
}: {
  template: string;
  slots: { id: string; optionIds: string[] }[];
  options: Option[];
  selected: string[];
  setSelected: (s: string[]) => void;
  phase: Phase;
  correctIds: string[];
  firstPick: string[];
}) {
  const [active, setActive] = useState(0);
  const revealed = phase === "revealed";
  const text = (id: string) => options.find((o) => o.id === id)?.text ?? "";
  const valueAt = (i: number) => selected[i] ?? "";

  function choose(optionId: string) {
    if (revealed) return;
    play("tap");
    const next = slots.map((_, i) => valueAt(i));
    next[active] = optionId;
    setSelected(next);
    const empty = next.findIndex((v, i) => i > active && !v);
    if (empty >= 0) setActive(empty);
  }

  const parts = template.split(/(\{\{[^}]+\}\})/g);
  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border-[3px] border-ink bg-[#1c1840] p-4 font-mono text-[0.95em] leading-relaxed text-white shadow-[0_5px_0_var(--ink)]">
        {parts.map((p, k) => {
          const m = p.match(/^\{\{([^}]+)\}\}$/);
          if (!m) return <span key={k}>{p}</span>;
          const i = slots.findIndex((s) => s.id === m[1].trim());
          if (i < 0) return <span key={k}>{p}</span>;
          const picked = revealed ? correctIds.find((id) => slots[i].optionIds.includes(id)) ?? "" : valueAt(i);
          const wrongFirst = revealed && firstPick[i] && firstPick[i] !== picked;
          return (
            <button
              key={k}
              onClick={() => !revealed && setActive(i)}
              className={`mx-0.5 inline-block rounded-lg border-2 px-2 py-0.5 align-baseline font-bold ${
                revealed
                  ? "border-white bg-green text-white"
                  : i === active
                    ? "border-yellow bg-yellow/20 text-yellow"
                    : picked
                      ? "border-white/70 text-white"
                      : "border-dashed border-white/60 text-white/60"
              }`}
            >
              {picked ? text(picked) : `hueco ${i + 1}`}
              {wrongFirst && <span className="ml-1 text-[0.8em] line-through opacity-70">{text(firstPick[i])}</span>}
            </button>
          );
        })}
      </pre>
      {!revealed && slots[active] && (
        <div className="space-y-2">
          <p className="text-center text-[0.9em] font-extrabold text-white">Hueco {active + 1}: elige el valor</p>
          <div className="flex flex-wrap justify-center gap-2">
            {slots[active].optionIds.map((id) => (
              <button
                key={id}
                onClick={() => choose(id)}
                className={`press chunk-sm px-3 py-2 font-mono text-[0.95em] font-bold ${valueAt(active) === id ? "!bg-yellow" : ""}`}
              >
                {text(id)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
