import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(frontendRoot, 'dist');
const sitemapPath = join(distRoot, 'sitemap.xml');
const failures = [];

if (!existsSync(sitemapPath)) {
  failures.push('Build-Ausgabe dist/sitemap.xml fehlt. Zuerst npm run build ausführen.');
} else {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const paths = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  const regionalPaths = paths.filter((path) => /\/(?:region|regionen|plz|postleitzahl)(?:\/|$)/i.test(path));

  if (regionalPaths.length) {
    failures.push(`Regionale Landingpages ohne geprüften Mehrwert gefunden: ${regionalPaths.join(', ')}`);
  }

  for (const requiredPath of ['/karte', '/wiki', '/bikes/bonfire', '/bikes/wildfire']) {
    if (!paths.some((path) => path === requiredPath || path === `${requiredPath}/`)) {
      failures.push(`Öffentlicher Kernpfad fehlt in der Sitemap: ${requiredPath}`);
    }
  }
}

if (failures.length) {
  console.error(`Content-Policy fehlgeschlagen (${failures.length} Fehler):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Content-Policy erfolgreich: Keine leeren regionalen Landingpages; regionale Inhalte laufen über /karte.');
}
