/**
 * Merge the per-island syllabus drafts (content/.pipeline/syllabus/<island>.json, written from
 * scripts/content/SYLLABUS_BRIEF.md) with scripts/content/skeleton.json into the app's
 * content/syllabus.json and content/services.json. Validates ids and references.
 *
 *   pnpm content:syllabus
 */
import fs from "node:fs";
import path from "node:path";
import type { Concept, ConfusableGroup, Domain, DomainId, Island, ServiceUnit, Syllabus } from "../../src/lib/content/types";

interface SkeletonUnit { id: string; nameEs: string; docs: string[] }
interface SkeletonIsland { id: string; name: string; nameEs: string; icon: string; color: string; units: SkeletonUnit[] }
interface Skeleton { domains: { id: DomainId; name: string; weight: number; islands: string[] }[]; islands: SkeletonIsland[] }

interface DraftUnit {
  id: string;
  name: string;
  nameEs: string;
  features: string[];
  prerequisiteUnits: string[];
  iconHint: string | null;
  competency: { title: string; knowledge: string[]; skills: string[] };
  concepts: string[];
}
interface DraftConcept {
  id: string;
  title: string;
  titleEs: string;
  unit: string;
  features: string[];
  prerequisites: string[];
  confusableGroup: string | null;
  importance: 1 | 2 | 3;
  docs: string[];
  summary: string;
}
interface Draft { islandId: string; units: DraftUnit[]; concepts: DraftConcept[]; confusableGroups: ConfusableGroup[] }

const ROOT = process.cwd();
const skeleton: Skeleton = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/content/skeleton.json"), "utf8"));
const DRAFTS = path.join(ROOT, "content/.pipeline/syllabus");
const docIndex: { url: string }[] = JSON.parse(fs.readFileSync(path.join(ROOT, "content/.pipeline/docs/index.json"), "utf8"));
const knownUrls = new Set(docIndex.map((d) => d.url));

const errors: string[] = [];
const warn: string[] = [];
const allUnitIds = new Set(skeleton.islands.flatMap((i) => i.units.map((u) => u.id)));

const islands: Island[] = [];
const units: ServiceUnit[] = [];
const concepts: Concept[] = [];
const groups: ConfusableGroup[] = [];
const tasksByDomain = new Map<DomainId, Domain["tasks"]>();
let unitOrder = 0;
let conceptOrder = 0;

for (const [islandIndex, si] of skeleton.islands.entries()) {
  const domain = skeleton.domains.find((d) => d.islands.includes(si.id))!.id;
  const file = path.join(DRAFTS, `${si.id}.json`);
  if (!fs.existsSync(file)) {
    warn.push(`${si.id}: sin borrador, se omite`);
    continue;
  }
  const draft: Draft = JSON.parse(fs.readFileSync(file, "utf8"));
  const draftConcepts = new Map(draft.concepts.map((c) => [c.id, c]));
  const islandConceptIds = new Set(draft.concepts.map((c) => c.id));

  islands.push({ id: si.id, name: si.name, nameEs: si.nameEs, emoji: "", color: si.color, order: islandIndex, units: si.units.map((u) => u.id) });

  for (const su of si.units) {
    const du = draft.units.find((u) => u.id === su.id);
    if (!du) {
      errors.push(`${si.id}: falta la unidad ${su.id}`);
      continue;
    }
    const taskId = `${domain}.${su.id}`;
    if (!tasksByDomain.has(domain)) tasksByDomain.set(domain, []);
    tasksByDomain.get(domain)!.push({ id: taskId, title: du.competency.title, knowledge: du.competency.knowledge, skills: du.competency.skills });

    for (const p of du.prerequisiteUnits) if (!allUnitIds.has(p)) errors.push(`${su.id}: prerequisiteUnit desconocida ${p}`);
    units.push({
      id: su.id,
      name: du.name,
      nameEs: du.nameEs || su.nameEs,
      island: si.id,
      services: du.features,
      concepts: du.concepts,
      prerequisiteUnits: du.prerequisiteUnits.filter((p) => allUnitIds.has(p)),
      order: ++unitOrder,
      iconHint: du.iconHint ?? si.icon,
    });

    for (const cid of du.concepts) {
      const dc = draftConcepts.get(cid);
      if (!dc) {
        errors.push(`${su.id}: concepto ${cid} no existe en concepts[]`);
        continue;
      }
      if (concepts.some((c) => c.id === cid)) errors.push(`concepto duplicado ${cid}`);
      for (const u of dc.docs) if (!knownUrls.has(u)) errors.push(`${cid}: URL de docs desconocida ${u}`);
      const prerequisites = dc.prerequisites.filter((p) => islandConceptIds.has(p));
      if (prerequisites.length !== dc.prerequisites.length) warn.push(`${cid}: prerrequisitos fuera de la isla descartados`);
      concepts.push({
        id: cid,
        title: dc.title,
        titleEs: dc.titleEs,
        domain,
        tasks: [taskId],
        services: dc.features,
        prerequisites,
        confusableGroup: dc.confusableGroup,
        examFrequency: dc.importance,
        order: ++conceptOrder,
        docs: dc.docs,
        summary: dc.summary,
      });
    }
  }
  const orphan = draft.concepts.filter((c) => !draft.units.some((u) => u.concepts.includes(c.id)));
  for (const c of orphan) errors.push(`${c.id}: no pertenece a ninguna unidad`);

  for (const g of draft.confusableGroups) {
    if (groups.some((x) => x.id === g.id)) errors.push(`grupo duplicado ${g.id}`);
    for (const c of g.concepts) if (!islandConceptIds.has(c)) errors.push(`grupo ${g.id}: concepto desconocido ${c}`);
    groups.push(g);
  }
}

const conceptIds = new Set(concepts.map((c) => c.id));
for (const c of concepts) if (c.confusableGroup && !groups.some((g) => g.id === c.confusableGroup)) errors.push(`${c.id}: grupo desconocido ${c.confusableGroup}`);
for (const g of groups) g.concepts = g.concepts.filter((c) => conceptIds.has(c));

if (errors.length) {
  console.error(`ERRORES (${errors.length}):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const syllabus: Syllabus = {
  exam: "Claude Code (competencias propias; pista CCAR-F opcional)",
  sourceUrls: ["https://code.claude.com/docs/llms.txt"],
  domains: skeleton.domains.map((d) => ({ id: d.id, name: d.name, weight: d.weight, tasks: tasksByDomain.get(d.id) ?? [] })),
  concepts,
  confusableGroups: groups,
};
fs.writeFileSync(path.join(ROOT, "content/syllabus.json"), JSON.stringify(syllabus, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, "content/services.json"), JSON.stringify({ islands, units }, null, 2) + "\n");

const byImportance = [1, 2, 3].map((n) => concepts.filter((c) => c.examFrequency === n).length);
console.log(`islas ${islands.length} · unidades ${units.length} · conceptos ${concepts.length} (importancia 1/2/3: ${byImportance.join("/")}) · grupos ${groups.length}`);
if (warn.length) console.log(`avisos:\n  ${warn.join("\n  ")}`);
