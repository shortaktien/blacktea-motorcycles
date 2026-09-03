import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchBtmKnowledge } from '../src/webmcp-search.ts';

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const frontendRoot = resolve(scriptDirectory, '..');
const sourcePath = join(frontendRoot, 'src', 'App.tsx');
const distRoot = join(frontendRoot, 'dist');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const fixtureEntries = [
  {
    kind: 'repair',
    title: 'Akku wird nicht erkannt',
    text: 'Ladegerät und Akku prüfen; die Anleitung erklärt die Diagnose.',
    href: '/hilfe/akku-bms',
  },
  {
    kind: 'repair',
    title: 'Wildfire-Fehlercodes richtig einordnen',
    text: 'Fehlercode 13: High-Side der MOSFETs beschädigt. Nicht weiterfahren.',
    href: '/hilfe/fehlercodes',
  },
  {
    kind: 'wiki',
    title: 'Wildfire',
    text: 'Frühes CT-22-Display mit ADJ- und SET-Taste.',
    href: '/bikes/wildfire',
  },
];

const intentCases = [
  { query: 'Akku wird nicht erkannt', scope: 'repair', expectedTitle: 'Akku wird nicht erkannt' },
  { query: 'Fehlercode 13', scope: 'repair', expectedTitle: 'Wildfire-Fehlercodes richtig einordnen' },
  { query: 'Display CT-22', scope: 'wiki', expectedTitle: 'Wildfire' },
];

for (const testCase of intentCases) {
  const result = JSON.parse(searchBtmKnowledge(fixtureEntries, 'https://btm.shortaktien.de', testCase.query, testCase.scope));
  check(result.ok === true, `${testCase.query}: Tool meldet keinen Erfolg`);
  check(result.resultCount > 0, `${testCase.query}: kein Ergebnis gefunden`);
  check(result.results.some((resultItem) => resultItem.title === testCase.expectedTitle), `${testCase.query}: falsches Ergebnis`);
  check(result.results.every((resultItem) => resultItem.url.startsWith('https://btm.shortaktien.de/')), `${testCase.query}: ungültiger Ergebnis-Link`);
}

const source = readFileSync(sourcePath, 'utf8');
check(source.includes("name: 'search_btm_knowledge'"), 'search_btm_knowledge ist nicht registriert');
check(source.includes('readOnlyHint: true'), 'readOnlyHint fehlt');
check(source.includes('untrustedContentHint: true'), 'untrustedContentHint fehlt');
check(source.includes('guide.detailSections.flatMap'), 'Reparatur-Details fehlen im Suchindex');

if (existsSync(distRoot)) {
  const assetNames = readdirSync(join(distRoot, 'assets')).filter((name) => /^index-.*\.js$/.test(name));
  const bundle = assetNames.map((name) => readFileSync(join(distRoot, 'assets', name), 'utf8')).join('\n');
  check(bundle.includes('search_btm_knowledge'), 'Build enthält kein WebMCP-Suchtool');
  check(bundle.includes('Wildfire-Fehlercodes richtig einordnen'), 'Build enthält die Fehlercode-Hilfe nicht');
  check(bundle.includes('Frühes CT-22-Display'), 'Build enthält den CT-22-Bezug nicht');
} else {
  failures.push('Kein dist-Verzeichnis gefunden; zuerst npm run build ausführen');
}

if (failures.length > 0) {
  console.error(`WebMCP-Vertragstest fehlgeschlagen (${failures.length} Fehler):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`WebMCP-Agent-Test erfolgreich: ${intentCases.length} Suchintentionen, Tool-Vertrag und Production-Bundle geprüft.`);
}
