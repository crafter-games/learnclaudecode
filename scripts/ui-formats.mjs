// Plays a round and screenshots every item, answering any format (choice, order, command, config).
//   node scripts/ui-formats.mjs http://localhost:3100 <screenshots-dir>
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const out = process.argv[3] ?? "shots-formats";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
page.on("response", (r) => r.status() >= 500 && problems.push(`HTTP ${r.status()} ${r.url()}`));
let n = 0;
const shot = (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, "0")}-${name}.png`, fullPage: true });
const seen = new Set();

await page.goto(`${base}/`, { waitUntil: "networkidle" });
if (await page.getByRole("button", { name: "Entendido" }).count()) await page.getByRole("button", { name: "Entendido" }).click();
await page.getByRole("button", { name: /Jugar/ }).waitFor({ timeout: 60_000 });
await shot("hub");
if (await page.getByRole("button", { name: /Voz sí/ }).count()) await page.getByRole("button", { name: /Voz sí/ }).click();
await page.getByRole("button", { name: /Jugar/ }).click();

for (let step = 0; step < 60; step++) {
  await page.waitForTimeout(500);
  if (await page.getByText(/Ronda brillante|Buena ronda|Sembrando/).count()) {
    await shot("result");
    break;
  }
  for (const label of [/^Ver respuesta$/, /^A jugar$/, /^Siguiente$/, /^Continuar$/, /^Empezar$/]) {
    const b = page.getByRole("button", { name: label });
    if (await b.count()) {
      await b.first().click().catch(() => {});
    }
  }
  const conf = page.getByRole("button", { name: /Bastante/ });
  if (!(await conf.count()) || (await page.getByText(/¡Casi!|¡Correcto!|Así era/).count())) continue;
  const tag = (await page.getByText(/^(Ordena|Completa el comando|Arma la config)$/).first().textContent().catch(() => null)) ?? "choice";
  if (!seen.has(tag)) await shot(`${tag.replace(/\s+/g, "-")}-before`);
  if (tag === "Ordena") {
    const items = page.locator("button:has(span.display)").filter({ hasNotText: /Siguiente/ });
    const c = await items.count();
    for (let i = 0; i < c; i++) await items.nth(i).click();
  } else if (tag === "Completa el comando") {
    await page.getByLabel("Tu respuesta").fill("/permissions");
  } else if (tag === "Arma la config") {
    for (let i = 0; i < 6; i++) {
      const chip = page.locator("button.font-mono").first();
      if (!(await chip.count())) break;
      await chip.click();
    }
  } else {
    const opts = page.locator("button:has(span[aria-hidden])");
    const need = (await page.getByText(/^Elige 2$/).count()) ? 2 : 1;
    for (let k = 0; k < need; k++) await opts.nth(k).click();
  }
  if (!(await conf.isEnabled({ timeout: 3000 }).catch(() => false))) {
    problems.push(`${tag}: no se pudo completar la respuesta`);
    await shot(`${tag}-stuck`);
    break;
  }
  try {
    await conf.click({ timeout: 8000 });
  } catch (e) {
    problems.push(`${tag}: no pude enviar (${e.message.split("\n")[0]})`);
    await shot(`${tag}-stuck`);
    break;
  }
  await page.waitForTimeout(1800);
  if (await page.getByRole("button", { name: /Ver respuesta/ }).count()) await page.getByRole("button", { name: /Ver respuesta/ }).click();
  await page.waitForTimeout(1500);
  if (!seen.has(tag)) {
    await shot(`${tag.replace(/\s+/g, "-")}-after`);
    seen.add(tag);
  }
}
console.log(`formatos vistos: ${[...seen].join(", ")}`);
console.log(problems.length ? `PROBLEMAS:\n  ${problems.join("\n  ")}` : "sin errores");
await browser.close();
