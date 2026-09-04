import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const frontendRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const lighthouseBin = join(frontendRoot, 'node_modules', '.bin', 'lighthouse');
const baseUrl = (process.env.LIGHTHOUSE_BASE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const paths = (process.env.LIGHTHOUSE_PATHS ?? '/,/wiki,/bikes/bonfire,/bikes/wildfire,/hilfe,/ersatzteile,/community')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean);
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
const failures = [];
const reportsRoot = mkdtempSync(join(tmpdir(), 'btm-lighthouse-'));

try {
  if (!existsSync(lighthouseBin)) {
    failures.push('Lighthouse ist nicht installiert. npm ci ausführen.');
  } else {
    for (const pathname of paths) {
      const url = `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
      const reportPath = join(reportsRoot, `${pathname === '/' ? 'home' : pathname.slice(1).replaceAll('/', '-')}.json`);
      const result = spawnSync(lighthouseBin, [
        url,
        '--output=json',
        `--output-path=${reportPath}`,
        '--only-categories=performance,accessibility,seo',
        '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
        '--quiet',
      ], {
        cwd: frontendRoot,
        env: { ...process.env, ...(chromePath ? { CHROME_PATH: chromePath } : {}) },
        encoding: 'utf8',
        stdio: 'inherit',
      });

      if (result.error || result.status !== 0 || !existsSync(reportPath)) {
        failures.push(`${pathname}: Lighthouse konnte die Seite nicht prüfen${result.error ? ` (${result.error.message})` : ''}`);
        continue;
      }

      let report;
      try {
        report = JSON.parse(readFileSync(reportPath, 'utf8'));
      } catch (error) {
        failures.push(`${pathname}: Lighthouse-Bericht ist ungültig (${error.message})`);
        continue;
      }

      const scores = Object.fromEntries(['performance', 'accessibility', 'seo'].map((category) => [category, report.categories?.[category]?.score]));
      const formattedScores = Object.entries(scores).map(([category, score]) => `${category} ${score === null || score === undefined ? 'n/a' : `${Math.round(score * 100)}/100`}`).join(' · ');
      console.log(`Lighthouse ${pathname}: ${formattedScores}`);

      for (const [category, score] of Object.entries(scores)) {
        if (typeof score !== 'number') failures.push(`${pathname}: Kategorie ${category} hat keinen Score`);
      }

      if (scores.accessibility < 0.9) failures.push(`${pathname}: Accessibility unter 90/100`);
      if (scores.seo < 0.9) failures.push(`${pathname}: SEO unter 90/100`);
      if (scores.performance < 0.5) failures.push(`${pathname}: Performance unter 50/100`);
    }
  }
} finally {
  rmSync(reportsRoot, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`Lighthouse-Prüfung fehlgeschlagen (${failures.length} Fehler):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Lighthouse-Prüfung erfolgreich: ${paths.length} Seiten mit Performance-, Accessibility- und SEO-Audits geprüft.`);
}
