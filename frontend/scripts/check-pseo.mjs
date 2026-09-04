import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const frontendRoot = process.cwd();
const distRoot = join(frontendRoot, 'dist', 'ersatzteile');
const catalogPath = join(frontendRoot, '..', 'research', 'parts.json');

assert.ok(existsSync(distRoot), 'Frontend-Dist fehlt. Erst `npm run build` ausführen.');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const expectedSlugs = catalog.historical_product_slugs ?? [];
const pages = readdirSync(distRoot)
  .filter((slug) => statSync(join(distRoot, slug)).isDirectory())
  .map((slug) => ({ slug, file: join(distRoot, slug, 'index.html') }))
  .filter(({ file }) => existsSync(file));

const decodeEntities = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));

const capture = (html, pattern) => decodeEntities(html.match(pattern)?.[1] ?? '').trim();
const bodyText = (html) => decodeEntities(
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ').trim();

const failures = [];
const descriptions = new Map();
for (const { slug, file } of pages) {
  const html = readFileSync(file, 'utf8');
  const title = capture(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = capture(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
  const heading = capture(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const canonical = capture(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  const visibleText = bodyText(main);
  const words = visibleText.split(/\s+/).filter(Boolean).length;

  if (!title || !description || !heading || !canonical) failures.push(`${slug}: title, Description, H1 oder Canonical fehlt`);
  if (/default title|undefined|copy of|kopie von/i.test(`${title} ${heading} ${visibleText}`)) failures.push(`${slug}: Platzhaltertext gefunden`);
  if (canonical) {
    try {
      if (new URL(canonical, 'https://btm.shortaktien.de').pathname !== `/ersatzteile/${slug}`) failures.push(`${slug}: Canonical zeigt auf eine andere Seite`);
    } catch {
      failures.push(`${slug}: Canonical ist keine gültige URL`);
    }
  }
  if (words < 220) failures.push(`${slug}: nur ${words} Wörter im Hauptinhalt, mindestens 220 erwartet`);
  if (description) descriptions.set(description, [...(descriptions.get(description) ?? []), slug]);
}

for (const [description, slugs] of descriptions) {
  if (slugs.length > 1) failures.push(`Doppelte Meta-Description (${slugs.length} Seiten): ${description.slice(0, 90)}`);
}

const pageSlugs = pages.map(({ slug }) => slug).sort();
assert.deepEqual(pageSlugs, [...expectedSlugs].sort(), 'pSEO-Seiten und Ersatzteilkatalog stimmen nicht überein');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`pSEO-Prüfung erfolgreich: ${pages.length} Ersatzteilseiten mit eindeutiger Meta-Description, H1, Canonical und ausreichendem Inhalt.`);
