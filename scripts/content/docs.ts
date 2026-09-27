/**
 * Mirror of the official Claude Code docs (Markdown) used to ground content and the RAG index.
 *
 *   pnpm docs:fetch            download every page listed in code.claude.com/docs/llms.txt
 *   pnpm docs:fetch --changed  only report pages whose content hash changed since the last run
 *
 * Output: content/.pipeline/docs/<slug>.md plus content/.pipeline/docs/index.json
 * ({ url, slug, title, section, description, sha256, fetchedAt }). The hashes let
 * content:refresh find items whose source page changed.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LLMS = "https://code.claude.com/docs/llms.txt";
const DIR = path.join(process.cwd(), "content", ".pipeline", "docs");
const INDEX = path.join(DIR, "index.json");
fs.mkdirSync(DIR, { recursive: true });

export interface DocPage {
  url: string;
  slug: string;
  title: string;
  section: string;
  description: string;
  sha256: string;
  fetchedAt: string;
}

/** "https://code.claude.com/docs/en/plugins/create.md" -> "plugins-create" */
export const slugOf = (url: string) =>
  url.replace(/^https:\/\/code\.claude\.com\/docs\/en\//, "").replace(/\.md$/, "").replace(/\//g, "-");

function parseLlms(text: string): Omit<DocPage, "sha256" | "fetchedAt">[] {
  const out: Omit<DocPage, "sha256" | "fetchedAt">[] = [];
  let section = "";
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^#{2,4}\s+(.+)$/);
    if (h) {
      section = h[1].trim();
      continue;
    }
    const m = line.match(/^- \[([^\]]+)\]\((https:\/\/code\.claude\.com\/docs\/en\/[^)]+\.md)\)(?::\s*(.*))?$/);
    if (m) out.push({ title: m[1], url: m[2], slug: slugOf(m[2]), section, description: m[3] ?? "" });
  }
  return out;
}

async function main() {
  const changedOnly = process.argv.includes("--changed");
  const previous: DocPage[] = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : [];
  const prevBySlug = new Map(previous.map((p) => [p.slug, p]));
  const pages = parseLlms(await (await fetch(LLMS)).text());
  console.log(`${pages.length} páginas en llms.txt`);

  const result: DocPage[] = [];
  const changed: string[] = [];
  const queue = [...pages];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          const res = await fetch(p.url, { headers: { "User-Agent": "learnclaudecode-docs-mirror" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.text();
          // A few pages come back as the claude.ai HTML shell instead of Markdown: keep the previous copy.
          if (/^s*<!doctype html|^s*<html/i.test(body)) throw new Error("HTML en vez de Markdown");
          const sha256 = createHash("sha256").update(body).digest("hex");
          if (prevBySlug.get(p.slug)?.sha256 !== sha256) changed.push(p.slug);
          if (!changedOnly) fs.writeFileSync(path.join(DIR, `${p.slug}.md`), `SOURCE: ${p.url}\n\n${body}`);
          result.push({ ...p, sha256, fetchedAt: new Date().toISOString() });
        } catch (e) {
          console.warn(`  fallo ${p.url}: ${(e as Error).message}`);
          const prev = prevBySlug.get(p.slug);
          if (prev) result.push(prev);
        }
      }
    }),
  );
  const removed = previous.filter((p) => !pages.some((x) => x.slug === p.slug)).map((p) => p.slug);
  const order = new Map(pages.map((p, i) => [p.slug, i]));
  result.sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
  if (!changedOnly) fs.writeFileSync(INDEX, JSON.stringify(result, null, 2));
  console.log(`cambiadas: ${changed.length}${changed.length && changed.length < 40 ? ` (${changed.join(", ")})` : ""}`);
  if (removed.length) console.log(`eliminadas: ${removed.join(", ")}`);
}

main();
