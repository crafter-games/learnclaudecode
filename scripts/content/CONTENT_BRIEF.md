# Brief: author the learning content of ONE unit

learnclaudecode is a Spanish-language study game that teaches **Claude Code** with evidence-based methods
(pretesting, retrieval practice, FSRS spaced repetition, successive relearning, interleaving, confidence
calibration, narrated diagrams). The learner is a developer who uses Claude Code daily, studies 1 h/day, has tired
eyes (keep text short) and listens to narration (TTS). You write everything for ONE unit.

## Inputs

- `content/services.json`: islands and units; your unit's entry lists its concept ids (`concepts`) in learning order.
- `content/syllabus.json`: each concept's `title`, `summary` (what the learner must be able to decide), `importance`
  (field `examFrequency`: 3 core/daily, 2 regular, 1 recognition), `docs` (source URLs), `confusableGroup`; plus
  `confusableGroups` with discriminators.
- `content/.pipeline/docs/<slug>.md`: the official docs mirror. A URL `https://code.claude.com/docs/en/<path>.md` maps to
  the slug `<path>` with `/` replaced by `-` (e.g. `plugins/create.md` → `plugins-create.md`).

Read the docs of every concept in your unit (the relevant sections of big pages). **Every fact must be supported by
those pages.** Claude Code changes weekly: never rely on memory for flags, keys, event names, defaults, file paths,
precedence or limits. If the docs don't say it, don't write it.

## Output

Write exactly one file: `content/.pipeline/drafts/<unitId>.json`, valid JSON:

```jsonc
{
  "unitId": "u-hook-events",
  "overview": { ... },            // "Descubrir" (below)
  "items": [ ... ],               // lightning / this-or-that (below)
  "concepts": [                   // one entry per concept of the unit, same order as services.json
    {
      "conceptId": "hook-event-pretooluse",
      "card": { "en": CardBody, "es": CardBody },
      "questions": [ DraftQuestion, ... ],
      "recall": [ Recall, ... ]
    }
  ]
}
```

### Language

Learner-facing Spanish is neutral Latin-American with "tú". **Keep Claude Code terms exactly as written in the docs,
in English and in `code` when they are literal**: commands (`/compact`), flags (`--resume`), files (`CLAUDE.md`,
`.claude/settings.json`), keys (`permissions.deny`), events (`PreToolUse`), tool names (`Bash`, `Edit`). The English
fields read like docs/exam English. Spanish and English must say the same thing.

### overview ("Descubrir": a narrated, segmented build-up of a diagram; pre-training before any question)

```jsonc
{
  "title": "Eventos de hooks",
  "hook": "≤ 15 palabras: el problema que esto resuelve.",
  "diagram": {
    "nodes": [ { "id": "claude", "label": "Claude", "kind": "actor", "x": 10, "y": 50 } ],
    "edges": [ { "from": "claude", "to": "tool", "label": "tool call" } ]
  },
  "segments": [ { "narration": "…", "show": ["claude"], "focus": "claude" } ],
  "keyPoints": ["3–5 bullets, ≤ 12 palabras"],
  "confusedWith": [ { "unitOrService": "permission rules", "difference": "≤ 20 palabras" } ]
}
```
- 3–7 nodes; `kind`: `service` (a Claude Code component/feature: hook, skill, subagent, MCP server, settings file…),
  `actor` (you, Claude, a teammate, CI), `data` (a file, a JSON payload, a message), `zone` (a boundary: project,
  user home, sandbox, cloud VM), `note`. Labels ≤ 18 characters (they are wrapped to 2 lines). x/y are 0–100 percentages,
  read left→right, ≥ 18 apart (a layout engine refines them).
- 4–7 segments, each 1–3 spoken sentences, ≤ 45 words, no lists/markdown/backticks (it is read aloud). `show` is
  cumulative (node ids visible from this segment on), `focus` the node being narrated.
- Segment order: the problem → the pieces → how it flows → the 1–2 decisions/variants that matter → when NOT to use it
  / what it gets confused with.

### items (lightning = pure retrieval, minimal reading; they are short formats)

```jsonc
{ "id": "u-hook-events--l1", "conceptId": "…", "format": "lightning",
  "prompt": "Block a Bash command before it runs → ?", "promptEs": "Bloquear un comando Bash antes de que corra → ?",
  "options": [ { "id": "A", "text": "PreToolUse" }, { "id": "B", "text": "PostToolUse" }, { "id": "C", "text": "Stop" }, { "id": "D", "text": "SessionStart" } ],
  "answer": "A", "why": "Español, ≤ 35 palabras: el requisito que decide y por qué la opción tentadora no sirve." }
```
- Per concept: 2 items (importance 1), 3 (importance 2), 4 (importance 3). Cover every concept.
- `prompt` ≤ 20 words, one requirement → answer. `lightning`: 4 options A–D, 1 correct, distractors are real
  look-alike features. `thisorthat`: 2 options A–B contrasting two confusables. ~70/30 mix.
- Options ≤ 8 words; the key is not systematically the longest; vary the letter. ids `<unitId>--l<n>`.

### card (micro-lesson shown after the pretest; 1–2 phone screens)

CardBody: `tldr` (2–3 sentences: what it is + the decision it drives), `whenToUse` (2–4), `keyFacts` (3–6, only
doc-backed; exact names/paths/defaults), `gotchas` (2–4 traps), `confusedWith` ([{concept, difference}], 0–3),
`examCues` (2–5 short English phrases in a request/scenario that signal this concept).

### questions (DraftQuestion)

Common fields: `format`, `type` ("single" | "multi"), `difficulty` (1–3), `stem`, `options` [{id, text, correct, why}],
`explanation` (3–5 sentences: the requirement that decides, why the key satisfies it, the tempting distractor's flaw),
`keywordCues` (exact English phrases from the stem that decide it), `secondaryConcepts` (ids of same-group siblings
exercised, else []), `es` {stem, options [{id, text, why}], explanation}.

How many per concept:
- **scenario** (the long, exam-style format): importance 3 → 4, importance 2 → 3, importance 1 → 1. A 2–4 sentence
  situation of a developer or team with concrete constraints, ending with a requirement qualifier such as "with the
  least setup", "so it applies to everyone who clones the repo", "without affecting other projects",
  "deterministically, every time", "without giving Claude write access". Single: 4 options A–D, 1 correct. Multi (at
  most 1 per concept, only importance ≥ 2): 5 options A–E, exactly 2 correct, stem ends "(Choose two.)".
  Distractors are real Claude Code mechanisms that miss exactly one requirement. Test decisions, not definitions.
- **command** (0–2, only when the concept has a command, flag, key, event or path worth recalling verbatim): the stem
  asks for ONE literal token or short command (≤ 40 chars) given a situation, e.g. "Which flag resumes the most
  recent conversation in this directory?". `options` = every accepted spelling, all `correct: true`, ids A, B…,
  `why: ""`; the first is canonical. Answers are compared case-sensitively after trimming, collapsing spaces and
  removing wrapping quotes/backticks, so list real variants only (`-c` and `--continue`). `type: "single"`.
  `es.options` = same ids and texts. Never ask for something with many valid phrasings, and never for a keyboard
  key/shortcut to press (Esc, Shift+Tab): the answer must be something you type.
- **order** (0–1, only when the docs define a real order: settings precedence, CLAUDE.md load order, hook event
  lifecycle, permission rule evaluation…): 3–5 items as `options` (all `correct: true`, `why: ""`), shown shuffled;
  `order` = the correct id sequence; the stem says which end comes first ("from highest to lowest precedence").
  `es.options` translate the item texts (keep literal names).
- **config** (0–1, only when the concept is about a file or JSON/YAML block: `settings.json`, `permissions`, `hooks`,
  `SKILL.md` frontmatter, agent frontmatter, `.mcp.json`, `plugin.json`, `marketplace.json`…): `template` is a short
  (≤ 12 lines) realistic snippet with 2–4 blanks written `{{1}}`, `{{2}}`…; `slots` = [{ "id": "1", "optionIds":
  ["1a","1b","1c"] }, …] with 2–4 choices per slot; `options` holds every choice with ids like `1a`, exactly one
  `correct: true` per slot, `why` on every option. The stem states the goal ("Make the hook block…"). Every blank must
  have exactly one valid answer given the goal and the rest of the snippet. `es.options` = same ids and texts (code);
  `es.stem`/`es.explanation` in Spanish.

### recall (spoken free recall, no options)

`{ "kind": "recall" | "why-not", "prompt": "English, ≤ 30 words", "promptEs": "…", "idealAnswer": "English, 2–3
sentences", "rubric": ["2–4 elements a complete answer must contain"] }`. One `recall` per concept; plus one `why-not`
(why a look-alike does NOT fit a situation) when the concept has a confusable group.

## Rules that matter most

- Doc-grounded, current, unambiguous: exactly one defensible answer for the stated requirement.
- Original wording. No trivia that rots (version numbers, release dates, prices).
- No emoji anywhere.

## Validate before finishing (with node)

JSON parses; every concept of the unit is present with its counts; option counts, ids, `answer`s, `order`, `slots`
and blanks are consistent; each config slot has exactly one correct option; es options mirror ids; node ids used in
segments/edges exist; ids unique. Then reply with the file path and a 3-line summary (counts + any doc doubt). Do
not paste the JSON.
