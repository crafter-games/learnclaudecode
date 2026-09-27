import type { Question } from "../content/types";

/** Command answers: case-sensitive (flags are), but whitespace and wrapping quotes/backticks don't matter. */
export function normalizeCommand(s: string): string {
  return s
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/^\$\s*/, "")
    .replace(/\s+/g, " ");
}

export function isCorrect(q: Question, selected: string[]): boolean {
  if (q.format === "order" && q.order) return q.order.length === selected.length && q.order.every((id, i) => id === selected[i]);
  if (q.format === "command") {
    const typed = normalizeCommand(selected[0] ?? "");
    return !!typed && q.options.some((o) => normalizeCommand(o.text) === typed);
  }
  const correct = q.options.filter((o) => o.correct).map((o) => o.id).sort();
  const sel = [...new Set(selected)].sort();
  return correct.length === sel.length && correct.every((id, i) => id === sel[i]);
}
