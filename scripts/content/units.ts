/**
 * Unit content pipeline for content authored and verified by Claude subagents.
 *
 *   pnpm content:units check  [unitIds…]   structural validation of drafts
 *   pnpm content:units blind  [unitIds…]   write answer-free copies for blind verification
 *   pnpm content:units finalize            apply verdicts; write content/units/*.json and content/concepts/*.json
 *   pnpm content:units status
 *
 * Briefs: CONTENT_BRIEF.md (author, → .pipeline/drafts/<unitId>.json) and VERIFY_BRIEF.md
 * (independent verifier, → .pipeline/verify/<unitId>.json). Policy on finalize:
 *   - fatal verdict, or a blind answer that differs from the key → the item is dropped;
 *   - explanation verdict → the fixed texts are applied and the item is kept;
 *   - cards: a fatal/explanation card is replaced by the verifier's fixed card (dropped if none);
 *   - every run backs up the previous content/units and content/concepts first.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  CardBody,
  ConceptContent,
  LightningItem,
  Question,
  QuestionFormat,
  RecallPrompt,
  ServiceUnit,
  Syllabus,
  UnitContent,
  UnitOverview,
} from "../../src/lib/content/types";
import { isCorrect } from "../../src/lib/study/grade";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const WORK = path.join(CONTENT, ".pipeline");
const DRAFTS = path.join(WORK, "drafts");
const BLIND = path.join(WORK, "blind");
const VERIFY = path.join(WORK, "verify");
for (const d of [DRAFTS, BLIND, VERIFY]) fs.mkdirSync(d, { recursive: true });

const syllabus: Syllabus = JSON.parse(fs.readFileSync(path.join(CONTENT, "syllabus.json"), "utf8"));
const services: { units: ServiceUnit[] } = JSON.parse(fs.readFileSync(path.join(CONTENT, "services.json"), "utf8"));
const conceptById = new Map(syllabus.concepts.map((c) => [c.id, c]));

interface DraftOption { id: string; text: string; correct: boolean; why: string }
interface DraftQuestion {
  format: Exclude<QuestionFormat, "lightning" | "thisorthat">;
  type: "single" | "multi";
  difficulty: 1 | 2 | 3;
  stem: string;
  options: DraftOption[];
  explanation: string;
  keywordCues: string[];
  secondaryConcepts: string[];
  es: { stem: string; options: { id: string; text: string; why: string }[]; explanation: string };
  order?: string[];
  template?: string;
  slots?: { id: string; optionIds: string[] }[];
}
interface DraftConcept {
  conceptId: string;
  card: { en: CardBody; es: CardBody };
  questions: DraftQuestion[];
  recall: Omit<RecallPrompt, "id" | "conceptId">[];
}
interface Draft { unitId: string; overview: UnitOverview; items: LightningItem[]; concepts: DraftConcept[] }

type Severity = "ok" | "explanation" | "fatal";
interface ItemVerdict {
  id: string;
  severity: Severity;
  issues: string[];
  fix?: {
    why?: string;
    explanation?: string;
    explanationEs?: string;
    optionWhy?: Record<string, string>;
    optionWhyEs?: Record<string, string>;
    stemEs?: string;
    promptEs?: string;
    addAccepted?: string[];
  };
}
interface Verdict {
  unitId: string;
  blind: { id: string; answer: string[] }[];
  items: ItemVerdict[];
  cards: { conceptId: string; severity: Severity; issues: string[]; fixed: { en: CardBody; es: CardBody } | null }[];
  recall: { conceptId: string; index: number; severity: Severity; issues: string[]; fixedIdealAnswer: string | null }[];
  overview: { severity: "ok" | "explanation"; issues: string[]; fixed: Pick<UnitOverview, "hook" | "segments" | "keyPoints" | "confusedWith"> | null };
}

const readJson = <T>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;
const draftOf = (u: string) => readJson<Draft>(path.join(DRAFTS, `${u}.json`));
const qid = (conceptId: string, i: number) => `${conceptId}--q${i}`;
const hash = (s: string) => parseInt(createHash("md5").update(s).digest("hex").slice(0, 8), 16);

// ------------------------------------------------------------------ check

function check(d: Draft): string[] {
  const e: string[] = [];
  const unit = services.units.find((u) => u.id === d.unitId);
  if (!unit) return [`unidad desconocida ${d.unitId}`];
  const nodes = new Set(d.overview.diagram.nodes.map((n) => n.id));
  for (const s of d.overview.segments) for (const id of [...s.show, s.focus].filter(Boolean)) if (!nodes.has(id!)) e.push(`segmento: nodo ${id}`);
  for (const ed of d.overview.diagram.edges) if (!nodes.has(ed.from) || !nodes.has(ed.to)) e.push(`arista ${ed.from}->${ed.to}`);
  const ids = new Set<string>();
  for (const it of d.items) {
    if (ids.has(it.id)) e.push(`id repetido ${it.id}`);
    ids.add(it.id);
    const n = it.format === "thisorthat" ? 2 : 4;
    if (it.options.length !== n) e.push(`${it.id}: ${it.options.length} opciones`);
    if (!it.options.some((o) => o.id === it.answer)) e.push(`${it.id}: answer inválido`);
    if (!unit.concepts.includes(it.conceptId)) e.push(`${it.id}: concepto ajeno ${it.conceptId}`);
  }
  for (const cid of unit.concepts) {
    const c = d.concepts.find((x) => x.conceptId === cid);
    if (!c) {
      e.push(`falta el concepto ${cid}`);
      continue;
    }
    if (d.items.filter((i) => i.conceptId === cid).length < 2) e.push(`${cid}: menos de 2 relámpago`);
    if (!c.questions.some((q) => q.format === "scenario")) e.push(`${cid}: sin escenario`);
    c.questions.forEach((q, i) => {
      const tag = `${cid} q${i} (${q.format})`;
      const esIds = q.es.options.map((o) => o.id).join();
      if (esIds !== q.options.map((o) => o.id).join()) e.push(`${tag}: opciones es no calzan`);
      if (q.format === "scenario") {
        const want = q.type === "multi" ? [5, 2] : [4, 1];
        if (q.options.length !== want[0] || q.options.filter((o) => o.correct).length !== want[1]) e.push(`${tag}: forma`);
      }
      if (q.format === "command" && (!q.options.length || q.options.some((o) => !o.correct))) e.push(`${tag}: aceptadas`);
      if (q.format === "order") {
        const set = new Set(q.options.map((o) => o.id));
        if (!q.order || q.order.length !== set.size || !q.order.every((x) => set.has(x))) e.push(`${tag}: order`);
      }
      if (q.format === "config") {
        if (!q.template || !q.slots?.length) e.push(`${tag}: template/slots`);
        for (const s of q.slots ?? []) {
          if (!q.template?.includes(`{{${s.id}}}`)) e.push(`${tag}: falta {{${s.id}}}`);
          const opts = q.options.filter((o) => s.optionIds.includes(o.id));
          if (opts.length !== s.optionIds.length || opts.filter((o) => o.correct).length !== 1) e.push(`${tag}: slot ${s.id}`);
        }
      }
    });
  }
  return e;
}

// ------------------------------------------------------------------ blind

function shuffle<T>(xs: T[], seed: number): T[] {
  const a = [...xs];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blind(d: Draft) {
  const out = {
    unitId: d.unitId,
    instructions: "Answer every entry. choice: option ids (answerCount of them); command: the literal text; order: all item ids in the requested order; config: one option id per slot, in slot order.",
    entries: [
      ...d.items.map((it) => ({ id: it.id, conceptId: it.conceptId, format: it.format, answerCount: 1, prompt: it.prompt, options: it.options })),
      ...d.concepts.flatMap((c) =>
        c.questions.map((q, i) => ({
          id: qid(c.conceptId, i),
          conceptId: c.conceptId,
          format: q.format,
          answerCount: q.format === "config" ? q.slots?.length : q.format === "order" ? q.options.length : q.format === "command" ? 1 : q.options.filter((o) => o.correct).length,
          stem: q.stem,
          options: q.format === "command" ? [] : shuffleIf(q).map((o) => ({ id: o.id, text: o.text })),
          template: q.template,
          slots: q.slots,
        })),
      ),
    ],
  };
  fs.writeFileSync(path.join(BLIND, `${d.unitId}.json`), JSON.stringify(out, null, 2));
  return out.entries.length;
}
const shuffleIf = (q: DraftQuestion) => (q.format === "order" ? shuffle(q.options, hash(q.stem)) : q.options);

// ------------------------------------------------------------------ finalize

function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(WORK, "backup", stamp);
  for (const sub of ["units", "concepts"]) {
    const src = path.join(CONTENT, sub);
    if (fs.existsSync(src) && fs.readdirSync(src).length) fs.cpSync(src, path.join(dir, sub), { recursive: true });
  }
  return dir;
}

function toQuestion(cid: string, q: DraftQuestion, fix: ItemVerdict["fix"]): Question {
  const c = conceptById.get(cid)!;
  const options = q.options.map((o) => ({ ...o, why: fix?.optionWhy?.[o.id] ?? o.why }));
  const accepted = (fix?.addAccepted ?? []).filter((t) => !options.some((o) => o.text === t));
  const letters = "ABCDEFGHIJ";
  for (const t of accepted) options.push({ id: letters[options.length] ?? `X${options.length}`, text: t, correct: true, why: "" });
  const esOptions = q.es.options.map((o) => ({ ...o, why: fix?.optionWhyEs?.[o.id] ?? o.why }));
  for (const o of options.slice(q.options.length)) esOptions.push({ id: o.id, text: o.text, why: "" });
  return {
    id: `${cid}--${createHash("sha1").update(q.format + q.stem).digest("hex").slice(0, 8)}`,
    conceptId: cid,
    secondaryConcepts: q.secondaryConcepts.filter((x) => conceptById.has(x) && x !== cid),
    domain: c.domain,
    type: q.type,
    difficulty: Math.min(3, Math.max(1, q.difficulty)) as 1 | 2 | 3,
    stem: q.stem,
    options,
    explanation: fix?.explanation ?? q.explanation,
    keywordCues: q.keywordCues,
    docs: c.docs,
    es: { stem: fix?.stemEs ?? q.es.stem, options: esOptions, explanation: fix?.explanationEs ?? q.es.explanation },
    heldOut: false,
    source: "generated",
    format: q.format === "scenario" ? undefined : q.format,
    order: q.order,
    template: q.template,
    slots: q.slots,
    verification: { status: fix ? "fixed" : "pass", notes: "" },
  };
}

function finalize() {
  const drafts = fs.readdirSync(DRAFTS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  const ready = drafts.filter((u) => fs.existsSync(path.join(VERIFY, `${u}.json`)));
  if (!ready.length) return console.log("Nada verificado todavía.");
  const dir = backup();
  const report: string[] = [];
  let kept = 0;
  let dropped = 0;
  let fixed = 0;
  for (const u of ready) {
    const d = draftOf(u);
    const v = readJson<Verdict>(path.join(VERIFY, `${u}.json`));
    if (!v.overview || !v.items?.length || !v.cards?.length) {
      report.push(`${u}: verificación incompleta, se omite`);
      continue;
    }
    const errs = check(d);
    if (errs.length) {
      report.push(`${u}: draft inválido, se omite — ${errs.join("; ")}`);
      continue;
    }
    const verdict = new Map(v.items.map((x) => [x.id, x]));
    const blindAns = new Map(v.blind.map((x) => [x.id, x.answer]));
    const keep = (id: string, keyOk: boolean) => {
      const x = verdict.get(id);
      if (!x) return report.push(`${id}: sin veredicto → descartado`), dropped++, false;
      if (x.severity === "fatal") return report.push(`${id}: fatal → ${x.issues.join("; ")}`), dropped++, false;
      if (!keyOk) return report.push(`${id}: a ciegas respondió ${blindAns.get(id)?.join(",")} → descartado (${x.issues.join("; ")})`), dropped++, false;
      if (x.severity === "explanation") fixed++;
      kept++;
      return true;
    };

    // Lightning items → unit file
    const items: LightningItem[] = d.items
      .filter((it) => keep(it.id, (blindAns.get(it.id) ?? []).join() === it.answer))
      .map((it) => {
        const f = verdict.get(it.id)?.fix;
        return { ...it, why: f?.why ?? it.why, promptEs: f?.promptEs ?? it.promptEs };
      });
    let overview = d.overview;
    if (v.overview.severity === "explanation" && v.overview.fixed) overview = { ...overview, ...v.overview.fixed };
    const unitOut: UnitContent = { unitId: u, audited: true, overview, items };
    fs.writeFileSync(path.join(CONTENT, "units", `${u}.json`), JSON.stringify(unitOut, null, 2));

    // Concepts → concept files
    for (const c of d.concepts) {
      const cardV = v.cards.find((x) => x.conceptId === c.conceptId);
      let card = c.card;
      if (cardV && cardV.severity !== "ok") {
        if (!cardV.fixed) {
          report.push(`${c.conceptId}: ficha ${cardV.severity} sin corrección → concepto omitido`);
          continue;
        }
        card = cardV.fixed;
      }
      const questions = c.questions
        .map((q, i) => ({ q, id: qid(c.conceptId, i) }))
        .filter(({ q, id }) => {
          const ans = blindAns.get(id) ?? [];
          const probe = toQuestion(c.conceptId, q, verdict.get(id)?.fix);
          return keep(id, isCorrect(probe, ans));
        })
        .map(({ q, id }) => toQuestion(c.conceptId, q, verdict.get(id)?.fix));
      const recall = c.recall
        .map((r, i) => ({ r, i, rv: v.recall.find((x) => x.conceptId === c.conceptId && x.index === i) }))
        .filter(({ rv }) => rv?.severity !== "fatal")
        .map(({ r, i, rv }) => ({ id: `${c.conceptId}--r${i}`, conceptId: c.conceptId, ...r, idealAnswer: rv?.fixedIdealAnswer ?? r.idealAnswer }));
      const scenarios = questions.filter((q) => !q.format);
      if (!scenarios.length) report.push(`${c.conceptId}: sin escenarios válidos — regenerar`);
      // One held-out scenario for mocks when there are ≥ 3 (stable: lowest hash).
      if (scenarios.length >= 3) scenarios.slice().sort((a, b) => hash(a.id) - hash(b.id))[0].heldOut = true;
      const out: ConceptContent = { conceptId: c.conceptId, card: { ...card, docs: conceptById.get(c.conceptId)!.docs }, questions, recall };
      fs.writeFileSync(path.join(CONTENT, "concepts", `${c.conceptId}.json`), JSON.stringify(out, null, 2));
    }
  }
  fs.writeFileSync(path.join(WORK, "units-report.txt"), report.join("\n"));
  console.log(`unidades ${ready.length} · ítems conservados ${kept} (corregidos ${fixed}) · descartados ${dropped}`);
  console.log(`backup: ${path.relative(ROOT, dir)} · detalle: content/.pipeline/units-report.txt`);
}

// ------------------------------------------------------------------ main

const [cmd, ...rest] = process.argv.slice(2);
const pick = () => (rest.length ? rest : fs.readdirSync(DRAFTS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
fs.mkdirSync(path.join(CONTENT, "units"), { recursive: true });
fs.mkdirSync(path.join(CONTENT, "concepts"), { recursive: true });

if (cmd === "check") {
  let bad = 0;
  for (const u of pick()) {
    const errs = check(draftOf(u));
    console.log(errs.length ? `${u}: ${errs.length} problemas\n  ${errs.join("\n  ")}` : `${u}: ok`);
    bad += errs.length;
  }
  process.exit(bad ? 1 : 0);
} else if (cmd === "blind") {
  for (const u of pick()) console.log(`${u}: ${blind(draftOf(u))} entradas`);
} else if (cmd === "finalize") {
  finalize();
} else {
  const drafts = fs.readdirSync(DRAFTS).length;
  const verified = fs.readdirSync(VERIFY).length;
  console.log(`unidades ${services.units.length} · borradores ${drafts} · verificadas ${verified}`);
}
