# Brief: author one island of the learnclaudecode syllabus

learnclaudecode is a Spanish-language, evidence-based study game (retrieval practice, FSRS spaced repetition,
interleaving of confusable concepts) that teaches **Claude Code** to a developer who uses it daily. You write the
syllabus for ONE island. The learner studies 1 h/day; every concept becomes a micro-card, 2–4 scenario questions,
short "lightning"/"this-or-that" items and a spoken recall prompt, so concepts must be **decision-sized**: one thing
the learner must be able to decide, configure or explain, not a documentation chapter.

## Inputs

- `scripts/content/skeleton.json`: domains, islands and units, each unit with its source doc slugs.
- `content/.pipeline/docs/<slug>.md`: the official docs mirror (code.claude.com/docs). Source URL of a slug:
  `https://code.claude.com/docs/en/<slug with the first "-" after "plugins"/"agent-sdk" kept as-is>.md`, but the
  simplest rule is: read the first line of the file (`SOURCE: <url>`), and use that URL exactly.
- `content/.pipeline/docs/index.json`: title/description of every page, to find related pages outside your unit list.

Read every doc page listed for your island's units (grep/skim big ones like `hooks.md`, `settings-reference.md`,
`env-vars.md`, `commands.md`, `errors.md` for the relevant sections only). Ground everything in these pages.
Nothing from memory that the docs don't support: Claude Code changes weekly and the docs are the source of truth.

## Output

Write exactly one file: `content/.pipeline/syllabus/<islandId>.json` (create the folder if needed), valid JSON:

```jsonc
{
  "islandId": "i5",
  "units": [
    {
      "id": "u-hook-events",            // exactly the skeleton id, same order as the skeleton
      "name": "Hook lifecycle events",   // English
      "nameEs": "Los eventos del ciclo de vida",  // keep the skeleton's nameEs unless clearly wrong
      "features": ["PreToolUse", "PostToolUse", "Stop"],   // 1–6 Claude Code feature/command/file names this unit is about
      "prerequisiteUnits": ["u-hooks-intro"],             // unit ids from ANY island in the skeleton that should be seen first
      "iconHint": null,
      "competency": {                    // the unit's learning objective, used as the readiness "task"
        "title": "Choose the right hook event for an automation",
        "knowledge": ["..."],            // 2–6 bullets, English
        "skills": ["..."]                // 2–6 bullets, English, observable ("Configure…", "Decide…", "Diagnose…")
      },
      "concepts": ["hook-event-pretooluse", "..."]  // ids of the concepts below that belong to this unit, in learning order
    }
  ],
  "concepts": [
    {
      "id": "hook-event-pretooluse",     // kebab-case, globally unique: prefix with the topic (hook-, skill-, mcp-, perm-, settings-, sdk-, ...)
      "title": "PreToolUse: intercept a tool call before it runs",
      "titleEs": "PreToolUse: interceptar una herramienta antes de que corra",
      "unit": "u-hook-events",
      "features": ["PreToolUse"],
      "prerequisites": [],               // concept ids from THIS island only
      "confusableGroup": "hook-events",  // id of a group below, or null
      "importance": 3,                   // 3 = daily use / core decision, 2 = regular, 1 = recognition only (know it exists and when to reach for it)
      "docs": ["https://code.claude.com/docs/en/hooks.md"],   // 1–3 exact SOURCE URLs that ground it; the first is the primary
      "summary": "What the learner must be able to decide or do, in 1–2 English sentences, concrete (names, flags, file paths)."
    }
  ],
  "confusableGroups": [
    {
      "id": "hook-events",
      "title": "PreToolUse vs PostToolUse vs PermissionRequest vs Stop",
      "concepts": ["hook-event-pretooluse", "..."],        // 2–6 concept ids from this island
      "discriminators": ["PreToolUse: ... cue ...", "..."] // one line per concept: the cue that picks it over the others
    }
  ]
}
```

## Sizing rules

- 1–3 concepts per unit; a whole island lands at ~14–24 concepts. Recognition-only units (desktop, IDEs,
  providers, enterprise administration, managed settings, deep links and the like) get 1–2 concepts with importance 1.
- Prefer concepts that are **confusable decisions** (skill vs subagent vs hook vs CLAUDE.md; `settings.local.json`
  vs `settings.json`; `--continue` vs `--resume`; `ask` vs `deny` rules; stdio vs HTTP MCP; project vs user scope).
  Every concept whose name a learner could mix up with another belongs to a confusable group.
- Precedence orders, event orders and load orders are gold: name them explicitly in summaries (they feed an
  "order it" question format).
- Config shapes are gold too: when a concept is about a file (`settings.json`, `SKILL.md` frontmatter, `.mcp.json`,
  agent frontmatter, `plugin.json`, `hooks` block), say which keys matter in the summary (they feed a
  "build the config" format).
- Do not invent flags, keys, events or commands. If the docs are ambiguous, leave it out.
- Skip marketing, pricing tables and version-specific trivia that will rot next week.

When done, reply with: the file path, the concept count, and any doc gaps or doubts in 3–5 lines. Do not paste the JSON.
