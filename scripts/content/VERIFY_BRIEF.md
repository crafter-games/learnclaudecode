# Brief: independently verify ONE unit's learning content

You are a strict technical reviewer of study material about **Claude Code**. Another author wrote the unit; you did
not. Your verdicts decide what reaches learners: a wrong answer key teaches a falsehood, so be rigorous, but don't
fail items for style.

## Step 1 — answer blind (before looking at any answer key)

Read `content/.pipeline/blind/<unitId>.json`. It lists every question and lightning item WITHOUT answers. Answer each
one using only your own reasoning plus the docs mirror (`content/.pipeline/docs/*.md`; a URL
`https://code.claude.com/docs/en/<path>.md` is the file `<path with / → ->.md`). For:
- choice formats: the option id(s) you pick (exactly as many as the item requires);
- `command`: the literal token/command you would type;
- `order`: the item ids in the order the stem asks for;
- `config`: one option id per slot, in slot order.

Write your answers into the output file (below) under `blind` **before** opening the draft. Do not open
`content/.pipeline/drafts/<unitId>.json` until your blind answers are written.

## Step 2 — audit against the docs

Now read the draft `content/.pipeline/drafts/<unitId>.json` and check everything against the docs of the unit's
concepts (see `content/syllabus.json` for each concept's `docs`). For each question/item decide a severity:
- `ok`: correct and unambiguous.
- `explanation`: the key is right and the item is fair, but a `why`, `explanation` or Spanish text is wrong, unclear or
  misleading → provide the corrected text(s).
- `fatal`: the key is wrong, another option is also defensible, the stem is ambiguous, a stem/option states something
  false or not supported by the docs, or (command) a correct spelling is missing from the accepted list or an
  accepted spelling is wrong → it will be dropped. If a command item only misses a valid spelling, prefer
  `explanation` and give `addAccepted`.

If your blind answer differed from the key, say in `issues` whether the key is right (your slip) or the item is
ambiguous/wrong (then `fatal`).

Also audit each concept card, each recall prompt and the overview (narration, key points, confusedWith).

House rules that are also defects:
- A `command` item whose answer is a keyboard key or shortcut to press (Esc, Shift+Tab) instead of something typed → `fatal`.
- Overview narration that spells commands out ("slash context", "guion guion debug") instead of writing them literally
  (/context, --debug) → overview `explanation` with the fixed overview.

## Output

Write `content/.pipeline/verify/<unitId>.json`:

```jsonc
{
  "unitId": "…",
  "blind": [ { "id": "<id from the blind file>", "answer": ["A"] } ],
  "items": [                                   // every question and lightning item, by blind-file id
    {
      "id": "…",
      "severity": "ok" | "explanation" | "fatal",
      "issues": ["…"],
      "fix": {                                  // only for "explanation"; include just the fields you change
        "why": "…",                             // lightning: Spanish why
        "explanation": "…", "explanationEs": "…",
        "optionWhy": { "A": "…" }, "optionWhyEs": { "A": "…" },
        "stemEs": "…", "promptEs": "…",
        "addAccepted": ["…"]                    // command: extra accepted spellings
      }
    }
  ],
  "cards": [ { "conceptId": "…", "severity": "ok" | "explanation" | "fatal", "issues": [], "fixed": null } ],
  // "fixed" = the full corrected card { "en": CardBody, "es": CardBody } when severity is "explanation" or "fatal"
  "recall": [ { "conceptId": "…", "index": 0, "severity": "ok" | "explanation" | "fatal", "issues": [], "fixedIdealAnswer": null, "fixedRubric": null } ],
  "overview": { "severity": "ok" | "explanation", "issues": [], "fixed": null }
  // overview "fixed" = { "hook", "segments", "keyPoints", "confusedWith" } rewritten, keeping node ids
}
```

Validate the JSON with node (every blind id appears once in `blind` and once in `items`). Reply with the path and one
line of counts per severity. Do not paste the JSON. Do not modify any other file.
