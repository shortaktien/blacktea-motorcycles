import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(frontendRoot, 'public');
const appSource = readFileSync(join(frontendRoot, 'src', 'App.tsx'), 'utf8');
const siteConfig = JSON.parse(readFileSync(join(frontendRoot, 'src', 'site-config.json'), 'utf8'));
const partsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts.json'), 'utf8'));
const partDetailsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts-details.json'), 'utf8'));
const siteOrigin = (process.env.VITE_SITE_URL || siteConfig.siteOrigin).replace(/\/+$/, '');
const lastModified = process.env.SEO_LASTMOD || new Date().toISOString().slice(0, 10);

const guidePattern = /id:\s*'([^']+)',\s*path:\s*'([^']+)',\s*title:\s*'([^']+)',\s*model:\s*'([^']+)',\s*intro:\s*'([^']+)'/g;
const guides = [...appSource.matchAll(guidePattern)].map((match) => ({
  id: match[1],
  path: match[2],
  title: match[3],
  model: match[4],
  intro: match[5],
}));

const mapFromApp = (name) => {
  const block = appSource.match(new RegExp(`const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
  const entries = {};
  const entryPattern = /(?:'([^']+)'|([A-Za-z0-9_-]+)):\s*'([^']+)'/g;
  for (const match of block.matchAll(entryPattern)) entries[match[1] ?? match[2]] = match[3];
  return entries;
};
const partTitleOverrides = mapFromApp('partTitleOverrides');
const partWordOverrides = mapFromApp('partWordOverrides');
const humanizePartSlug = (slug) => {
  if (partTitleOverrides[slug]) return partTitleOverrides[slug];
  return slug.replace(/^copy-of-/, '').split('-').map((word) => partWordOverrides[word] ?? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(' ');
};
const parts = (partsCatalog.historical_product_slugs ?? []).map((slug) => ({
  id: slug,
  title: partTitleOverrides[slug] ?? partDetailsCatalog.entries?.find((entry) => entry.slug === slug && entry.ok)?.title ?? humanizePartSlug(slug),
  path: `/ersatzteile/${slug}`,
}));

if (guides.length === 0) {
  throw new Error('Keine Reparaturhilfen aus App.tsx gefunden. SEO-Dateien werden nicht erzeugt.');
}

const staticPages = [
  { path: '/', title: 'Black Tea Hilfe — Dokumente, Ersatzteile & Updates', description: 'Unabhängige Sammelstelle für Black Tea Motorbikes: lokale PDFs, Ersatzteile, Reparaturhilfen und nachvollziehbare Quellen.' },
  { path: '/hilfe', title: 'Reparaturhilfe — Black Tea Hilfe', description: 'Redaktionell geordnete Reparaturhilfen für typische Bonfire- und Wildfire-Fehlerbilder — mit Kurzablauf, ausführlicher Prüfung, Sicherheit und Quelle.' },
  { path: '/ersatzteile', title: 'Ersatzteile — Black Tea Hilfe', description: 'Historischer BTM-Ersatzteilkatalog mit Modellbezug, Teilenamen und Quellen. Bestand und Preise vor dem Kauf prüfen.' },
  { path: '/community', title: 'BTM Community-Wissen — Black Tea Hilfe', description: 'Technische Hinweise aus der Black Tea Community verständlich zusammengefasst, mit lokalen PDFs und Originalquellen.' },
  { path: '/quellen', title: 'Quellen — Black Tea Hilfe', description: 'Nachvollziehbare Quellen zu Insolvenzstatus, Handbüchern, lokalen PDFs, Ersatzteilspuren und Community-Wissen.' },
  { path: '/impressum', title: 'Impressum — Black Tea Hilfe', description: 'Anbieterinformationen und rechtliche Hinweise zu Black Tea Hilfe.' },
  { path: '/datenschutz', title: 'Datenschutz — Black Tea Hilfe', description: 'Datenschutzhinweise zu Kommentaren, Bildanhängen und dem Betrieb von Black Tea Hilfe.' },
  { path: '/wiki', title: 'Wiki — Black Tea Hilfe', description: 'Das BTM-Wiki wird vorbereitet.' },
];

const pdfFiles = readdirSync(join(publicRoot, 'pdfs')).filter((file) => file.toLowerCase().endsWith('.pdf')).sort();
const ownPaths = [
  ...staticPages.map((page) => page.path),
  ...guides.map((guide) => guide.path),
  ...parts.map((part) => part.path),
  '/pdfs/index.html',
  ...pdfFiles.map((file) => `/pdfs/${file}`),
];

const absoluteUrl = (path) => `${siteOrigin}${path === '/' ? '/' : path}`;
const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ownPaths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc><lastmod>${lastModified}</lastmod></url>`),
  '</urlset>',
  '',
].join('\n');

const guideLinks = guides.map((guide) => `- [${guide.title}](${absoluteUrl(guide.path)}): ${guide.model}. ${guide.intro}`).join('\n');
const pdfLinks = pdfFiles.map((file) => `- [${file}](${absoluteUrl(`/pdfs/${file}`)}): Lokale PDF-Kopie im Dokumentenarchiv.`).join('\n');

const llms = [
  '# Black Tea Hilfe',
  '',
  '> Unabhängige deutschsprachige Sammelstelle für Black Tea Motorbikes mit lokalen Dokumenten, Ersatzteilspuren, Reparaturhilfen und überprüfbaren Quellen.',
  '',
  'Die Website richtet sich an Besitzerinnen und Besitzer von Bonfire- und Wildfire-Modellen. Historische Angaben, Community-Hinweise und Ersatzteilkandidaten sind keine Herstellerfreigabe. Sicherheitskritische Arbeiten gehören in qualifizierte Hände.',
  '',
  '## Kernseiten',
  '',
  ...staticPages.map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`),
  '',
  '## Reparaturhilfen',
  '',
  guideLinks,
  '',
  '## Ersatzteile',
  '',
  `- [Ersatzteilkatalog](${absoluteUrl('/ersatzteile')}): Historische BTM-Shop-Einträge mit eigener Detailseite, lokal gesicherten Archivdaten und einem nur bei belegter Passform veröffentlichten Kauf-Link.`,
  '',
  '## Dokumente',
  '',
  `- [PDF-Index](${absoluteUrl('/pdfs/index.html')}): Übersicht der lokal gesicherten Handbücher, Schaltpläne, Datenblätter und Community-PDFs.`,
  '',
  '## Optional',
  '',
  `- [Vollständiger LLM-Index](${absoluteUrl('/full-llms.txt')}): Ausführliche Seiten-, Reparatur- und Dokumentübersicht.`,
  `- [Sitemap](${absoluteUrl('/sitemap.xml')}): Indexierbare HTML- und PDF-URLs.`,
  '',
].join('\n');

const fullLlms = [
  '# Black Tea Hilfe — vollständiger Inhaltsindex',
  '',
  `> Vollständige, maschinenlesbare Übersicht der öffentlich zugänglichen Inhalte von ${siteOrigin}. Stand: ${lastModified}.`,
  '',
  '## Einordnung',
  '',
  '- Black Tea Hilfe ist eine unabhängige private Sammelstelle und nicht mit der Black Tea Motorbikes GmbH verbunden.',
  '- Die offiziellen Seiten und Shopangaben können historisch sein. Preise, Bestand, Modellzuordnung und Passform müssen vor jeder Bestellung geprüft werden.',
  '- Community-Hinweise werden redaktionell gekürzt und mit Quellen versehen. Sie ersetzen keine Reparatur-, Rechts- oder Garantieberatung.',
  '- Akku, BMS, Hochvolt, Controller, Fahrwerk und Bremsen sind sicherheitskritisch. Keine Arbeiten unter Spannung oder ohne passende Fachkenntnis empfehlen.',
  '',
  '## Übersichtsseiten',
  '',
  ...staticPages.map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`),
  '',
  '## Reparaturhilfen',
  '',
  ...guides.flatMap((guide) => [
    `### ${guide.title}`,
    '',
    `- [Reparaturhilfe öffnen](${absoluteUrl(guide.path)})`,
    `- Modell-/Themenbezug: ${guide.model}`,
    `- Kurzbeschreibung: ${guide.intro}`,
    '- Aufbau: Kurzablauf, Sicherheitswarnung, ausführliche Reparaturhilfe, moderierte Erfahrungsberichte und Quellenangabe.',
    '',
  ]),
  '## Ersatzteile',
  '',
  ...parts.map((part) => [
    `### ${part.title}`,
    '',
    `- [Ersatzteilseite öffnen](${absoluteUrl(part.path)})`,
    '- Lokal gesicherte historische BTM-Shop-Daten und Bezugsstatus: Amazon oder Fachhandel werden nur bei belegter Teilenummer und Passform verlinkt.',
    '',
  ]).flat(),
  '## Lokale PDFs',
  '',
  `- [PDF-Index](${absoluteUrl('/pdfs/index.html')}): Vollständige Übersicht der gesicherten Dokumente.`,
  pdfLinks,
  '',
  '## Bezugs- und Quellenlogik',
  '',
  '- Ersatzteilkandidaten werden zuerst über Amazon geprüft; wenn dort kein belastbarer Treffer existiert, werden deutsche oder EU-Fachhändler berücksichtigt.',
  '- Alibaba wird nicht als Bezugsquelle verwendet.',
  '- Externe Links sind als Quellen oder Gegenprüfmöglichkeiten gekennzeichnet. Lokale PDF-Links bleiben auf dieser Website verfügbar.',
  '',
  '## Daten und Aktualität',
  '',
  `- Letzte automatische Index-Aktualisierung: ${lastModified}.`,
  '- Für aktuelle Verfügbarkeit, Preise und rechtliche Verfahrensstände immer die jeweils verlinkte Quelle und den eigenen Modell-/Baujahrstand prüfen.',
  '',
].join('\n');

const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /api/',
  'Disallow: /src/',
  'Disallow: /node_modules/',
  `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
  '',
].join('\n');

const prerenderedPaths = [...staticPages.map((page) => page.path), ...guides.map((guide) => guide.path), ...parts.map((part) => part.path), '/admin'];
const redirects = prerenderedPaths
  .filter((path) => path !== '/')
  .map((path) => `${path} ${path}/index.html 200`)
  .join('\n') + '\n';

writeFileSync(join(publicRoot, 'sitemap.xml'), sitemap);
writeFileSync(join(publicRoot, 'llms.txt'), llms);
writeFileSync(join(publicRoot, 'full-llms.txt'), fullLlms);
writeFileSync(join(publicRoot, 'robots.txt'), robots);
writeFileSync(join(publicRoot, '_redirects'), redirects);

console.log(`SEO-Dateien erzeugt: ${guides.length} Reparaturhilfen, ${pdfFiles.length} PDFs, ${ownPaths.length} URLs (${siteOrigin})`);
