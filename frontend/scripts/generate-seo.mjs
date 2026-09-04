import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(frontendRoot, 'public');
const wikiRoot = join(frontendRoot, '..', 'content', 'wiki');
const appSource = readFileSync(join(frontendRoot, 'src', 'App.tsx'), 'utf8');
const siteConfig = JSON.parse(readFileSync(join(frontendRoot, 'src', 'site-config.json'), 'utf8'));
const partsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts.json'), 'utf8'));
const partDetailsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts-details.json'), 'utf8'));
const siteOrigin = (process.env.VITE_SITE_URL || siteConfig.siteOrigin).replace(/\/+$/, '');
const generatedAt = new Date().toISOString().slice(0, 10);
const explicitLastmod = process.env.SEO_LASTMOD?.trim() || null;
let lastmodByPath = {};
if (process.env.SEO_LASTMOD_MAP) {
  try {
    lastmodByPath = JSON.parse(process.env.SEO_LASTMOD_MAP);
  } catch (error) {
    throw new Error(`SEO_LASTMOD_MAP ist kein gültiges JSON: ${error.message}`);
  }
}

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

const collectMarkdownFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = join(directory, entry.name);
  return entry.isDirectory() ? collectMarkdownFiles(entryPath) : entry.name.toLowerCase().endsWith('.md') ? [entryPath] : [];
});
const parseWikiArticle = (filePath) => {
  const source = readFileSync(filePath, 'utf8');
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = {};
  for (const line of (frontmatterMatch?.[1] ?? '').split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^("|')([\s\S]*)\1$/, '$2');
  }
  const relativePath = filePath.slice(wikiRoot.length + 1).replaceAll('\\', '/');
  const articlePath = relativePath.replace(/\.md$/, '').replace(/\/index$/, '');
  const lastUpdated = fields.lastUpdated ?? fields.updated ?? fields.dateModified;
  const history = (fields.history ?? '').split(';').map((entry) => {
    const separator = entry.indexOf('|');
    return separator > 0
      ? { date: entry.slice(0, separator).trim(), label: entry.slice(separator + 1).trim() }
      : { date: lastUpdated ?? 'unbekannt', label: entry.trim() };
  }).filter((entry) => entry.label);
  return {
    path: `/bikes/${articlePath}`,
    title: fields.title ?? articlePath,
    model: fields.model ?? 'Bikes',
    intro: fields.intro ?? 'Redaktionell aufbereiteter Wiki-Artikel aus lokal gesicherten Quellen.',
    revision: fields.revision ?? lastUpdated,
    reviewedAt: fields.reviewedAt ?? lastUpdated,
    licenseStatus: fields.licenseStatus ?? 'Eigene redaktionelle Aufbereitung; Originalquellen bleiben bei ihren Rechteinhabern.',
    sourceChain: fields.sourceChain ?? 'Lokale Dokumente → redaktionelle Aufbereitung → geprüfte Community-Ergänzungen',
    source: fields.source,
    sourceLabel: fields.sourceLabel,
    history: history.length ? history : [{ date: lastUpdated ?? 'unbekannt', label: 'Artikel redaktionell erfasst' }],
  };
};
const wikiArticles = collectMarkdownFiles(wikiRoot).map(parseWikiArticle).sort((left, right) => left.title.localeCompare(right.title, 'de'));

if (guides.length === 0) {
  throw new Error('Keine Reparaturhilfen aus App.tsx gefunden. SEO-Dateien werden nicht erzeugt.');
}

const staticPages = [
  // Regionale PLZ-Seiten bleiben bewusst außen vor, bis dort eigener lokaler
  // Mehrwert existiert. Die ungefähre Verortung läuft ausschließlich über /karte.
  { path: '/', title: 'Black Tea Motorbikes – Hilfe — Community & Reparaturwissen', description: 'Der Treffpunkt für Bonfire- und Wildfire-Rider: Community, DACH-Karte, Reparaturhilfe, Ersatzteile, Wiki und PDFs. Wissen finden und Erfahrungen teilen.' },
  { path: '/hilfe', title: 'Reparaturhilfe — Black Tea Motorbikes – Hilfe', description: 'Redaktionell geordnete Reparaturhilfen für typische Bonfire- und Wildfire-Fehlerbilder — mit Kurzablauf, ausführlicher Prüfung, Sicherheit und Quelle.' },
  { path: '/hilfe/anfragen', title: 'Reparatur anfragen — Black Tea Motorbikes – Hilfe', description: 'Reparaturanfragen zu Black Tea Bonfire und Wildfire stellen, Erfahrungen teilen und gemeinsam nachvollziehbare Lösungen dokumentieren.' },
  { path: '/ersatzteile', title: 'Ersatzteile — Black Tea Motorbikes – Hilfe', description: 'Historischer BTM-Ersatzteilkatalog mit Modellbezug, Teilenamen und Quellen. Bestand und Preise vor dem Kauf prüfen.' },
  { path: '/community', title: 'BTM Community — Black Tea Motorbikes – Hilfe', description: 'Erfahrungen, Umbauten und Reparaturtipps von BTM-Ridern teilen und die neuesten Beiträge der Community entdecken.' },
  { path: '/faq', title: 'FAQ — Black Tea Motorbikes – Hilfe', description: 'Eigenständig beantwortete Fragen zu Black Tea Bonfire und Wildfire: Varianten, Reichweite, Display, Akku, Bremsen und Wartung.' },
  { path: '/karte', title: 'Community-Karte — Black Tea Motorbikes – Hilfe', description: 'Ungefähre PLZ-Regionen der BTM-Community in Deutschland, Österreich und der Schweiz.' },
  { path: '/quellen', title: 'Quellen — Black Tea Motorbikes – Hilfe', description: 'Nachvollziehbare Quellen zu Insolvenzstatus, Handbüchern, lokalen PDFs, Ersatzteilspuren und Community-Wissen.' },
  { path: '/impressum', title: 'Impressum — Black Tea Motorbikes – Hilfe', description: 'Anbieterinformationen und rechtliche Hinweise zu Black Tea Motorbikes – Hilfe.' },
  { path: '/datenschutz', title: 'Datenschutz — Black Tea Motorbikes – Hilfe', description: 'Datenschutzhinweise zu Kommentaren, Bildanhängen und dem Betrieb von Black Tea Motorbikes – Hilfe.' },
  { path: '/wiki', title: 'Wiki — Black Tea Motorbikes – Hilfe', description: 'Das BTM-Wiki enthält redaktionell geprüfte Artikel zu Bonfire und Wildfire und wird gemeinsam erweitert.' },
  { path: '/bikes/bonfire', title: 'Bonfire — Bikes — Black Tea Motorbikes – Hilfe', description: 'Technische Wiki-Seite zur Black Tea Bonfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
  { path: '/bikes/wildfire', title: 'Wildfire — Bikes — Black Tea Motorbikes – Hilfe', description: 'Technische Wiki-Seite zur Black Tea Wildfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
  { path: '/login', title: 'Einloggen — Black Tea Motorbikes – Hilfe', description: 'In den persönlichen BTM-Hilfe-Bereich einloggen.', robots: 'noindex,nofollow,noarchive' },
  { path: '/registrieren', title: 'Registrieren — Black Tea Motorbikes – Hilfe', description: 'Ein persönliches BTM-Hilfe-Konto mit Mailjet-Bestätigung anlegen.', robots: 'noindex,nofollow,noarchive' },
  { path: '/konto', title: 'Mein Bereich — Black Tea Motorbikes – Hilfe', description: 'Persönliche Bike-Einstellungen und Benachrichtigungen bei BTM-Hilfe.', robots: 'noindex,nofollow,noarchive' },
  { path: '/passwort-zuruecksetzen', title: 'Passwort zurücksetzen — Black Tea Motorbikes – Hilfe', description: 'Sicheren Link zum Zurücksetzen des BTM-Hilfe-Passworts verwenden.', robots: 'noindex,nofollow,noarchive' },
];

const pdfFiles = readdirSync(join(publicRoot, 'pdfs')).filter((file) => file.toLowerCase().endsWith('.pdf')).sort();
const ownPaths = [...new Set([
  ...staticPages.filter((page) => !page.robots?.startsWith('noindex')).map((page) => page.path),
  ...guides.map((guide) => guide.path),
  ...parts.map((part) => part.path),
  ...wikiArticles.map((article) => article.path),
  '/pdfs/index.html',
  ...pdfFiles.map((file) => `/pdfs/${file}`),
])];

const absoluteUrl = (path) => `${siteOrigin}${path === '/' ? '/' : path}`;
const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
const lastmodFor = (path) => {
  const value = lastmodByPath[path] ?? explicitLastmod;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `<lastmod>${value}</lastmod>` : '';
};

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ownPaths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmodFor(path)}</url>`),
  '</urlset>',
  '',
].join('\n');

const guideLinks = guides.map((guide) => `- [${guide.title}](${absoluteUrl(guide.path)}): ${guide.model}. ${guide.intro}`).join('\n');
const pdfLinks = pdfFiles.map((file) => `- [${file}](${absoluteUrl(`/pdfs/${file}`)}): Lokale PDF-Kopie im Dokumentenarchiv.`).join('\n');
const wikiLinks = wikiArticles.map((article) => `- [${article.title}](${absoluteUrl(article.path)}): ${article.model}. ${article.intro}`).join('\n');

const openKnowledgeManifest = {
  manifestType: 'BTM Open Knowledge',
  schemaVersion: '1.0',
  generatedAt,
  language: 'de-DE',
  licensePolicy: 'Eigene redaktionelle Aufbereitungen werden als solche gekennzeichnet; Originalquellen bleiben bei ihren jeweiligen Rechteinhabern.',
  regionalContentPolicy: 'Regionale Seiten werden erst veröffentlicht, wenn sie eigenen lokalen Mehrwert bieten. Die ungefähre PLZ-Verortung bleibt bis dahin auf /karte gebündelt.',
  entries: [
    ...wikiArticles.map((article) => ({
      kind: 'wiki',
      url: absoluteUrl(article.path),
      title: article.title,
      model: article.model,
      revision: article.revision ?? 'unbekannt',
      lastReviewed: article.reviewedAt ?? 'unbekannt',
      licenseStatus: article.licenseStatus,
      sourceChain: article.sourceChain,
      history: article.history,
      sources: article.source ? [{ url: article.source.startsWith('http') ? article.source : absoluteUrl(article.source), label: article.sourceLabel ?? 'Lokale Quelle' }] : [],
    })),
    ...guides.map((guide) => ({
      kind: 'repair-guide',
      url: absoluteUrl(guide.path),
      title: guide.title,
      model: guide.model,
      revision: '2026-09-02',
      lastReviewed: '2026-09-02',
      licenseStatus: 'Eigene redaktionelle Aufbereitung; Originalquelle bleibt bei ihrem Rechteinhaber.',
      sourceChain: 'Community-Hinweise → redaktionelle Reparaturhilfe → geprüfte Community-Ergänzungen',
      history: [{ date: '2026-09-02', label: 'Reparaturhilfe redaktionell geprüft' }],
      sources: [],
    })),
    ...parts.map((part) => {
      const archived = partDetailsCatalog.entries?.find((entry) => entry.slug === part.id && entry.ok);
      const sourceUrl = archived?.archive;
      const reviewedAt = partsCatalog.sourcing_policy?.checked_at ?? '2026-09-04';
      return {
        kind: 'part',
        url: absoluteUrl(part.path),
        title: part.title,
        revision: reviewedAt,
        lastReviewed: reviewedAt,
        licenseStatus: 'Eigene Beschreibung; Archiv- und Herstellerinhalte bleiben bei ihren Rechteinhabern.',
        sourceChain: 'Historischer Shop-Eintrag → Archivaufnahme → technische Recherche → Bezugslink, falls belastbar',
        history: [{ date: reviewedAt, label: 'Ersatzteil-Datensatz zuletzt redaktionell geprüft' }],
        sources: sourceUrl ? [{ url: sourceUrl, label: 'Archivierter Originaleintrag' }] : [],
      };
    }),
  ],
};

writeFileSync(join(publicRoot, 'open-knowledge.json'), `${JSON.stringify(openKnowledgeManifest, null, 2)}\n`);

const llms = [
  '# Black Tea Motorbikes – Hilfe',
  '',
  '> Unabhängige deutschsprachige Sammelstelle für Black Tea Motorbikes mit lokalen Dokumenten, Ersatzteilspuren, Reparaturhilfen und überprüfbaren Quellen.',
  '',
  'Die Website richtet sich an Besitzerinnen und Besitzer von Bonfire- und Wildfire-Modellen. Historische Angaben, Community-Hinweise und Ersatzteilkandidaten sind keine Herstellerfreigabe. Sicherheitskritische Arbeiten gehören in qualifizierte Hände.',
  '',
  '## Kernseiten',
  '',
  ...staticPages.filter((page) => !page.robots?.startsWith('noindex')).map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`),
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
  '## Bikes-Wiki',
  '',
  wikiLinks,
  '',
  '## Optional',
  '',
  `- [Vollständiger LLM-Index](${absoluteUrl('/full-llms.txt')}): Ausführliche Seiten-, Reparatur- und Dokumentübersicht.`,
  `- [Open-Knowledge-Manifest](${absoluteUrl('/open-knowledge.json')}): Version, letzte Prüfung, Lizenzstatus, Bearbeitungshistorie und Quellenkette je Wissenseintrag.`,
  `- [Sitemap](${absoluteUrl('/sitemap.xml')}): Indexierbare HTML- und PDF-URLs.`,
  '',
].join('\n');

const fullLlms = [
  '# Black Tea Motorbikes – Hilfe — vollständiger Inhaltsindex',
  '',
  `> Vollständige, maschinenlesbare Übersicht der öffentlich zugänglichen Inhalte von ${siteOrigin}. Build-Index: ${generatedAt}.`,
  '',
  '## Einordnung',
  '',
  '- Black Tea Motorbikes – Hilfe ist eine unabhängige private Sammelstelle und nicht mit der Black Tea Motorbikes GmbH verbunden.',
  '- Die offiziellen Seiten und Shopangaben können historisch sein. Preise, Bestand, Modellzuordnung und Passform müssen vor jeder Bestellung geprüft werden.',
  '- Community-Hinweise werden redaktionell gekürzt und mit Quellen versehen. Sie ersetzen keine Reparatur-, Rechts- oder Garantieberatung.',
  '- Akku, BMS, Hochvolt, Controller, Fahrwerk und Bremsen sind sicherheitskritisch. Keine Arbeiten unter Spannung oder ohne passende Fachkenntnis empfehlen.',
  '',
  '## Übersichtsseiten',
  '',
  ...staticPages.filter((page) => !page.robots?.startsWith('noindex')).map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`),
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
  '## Bikes-Wiki',
  '',
  ...wikiArticles.flatMap((article) => [
    `### ${article.title}`,
    '',
    `- [Wiki-Artikel öffnen](${absoluteUrl(article.path)})`,
    `- Modellbezug: ${article.model}`,
    `- Kurzbeschreibung: ${article.intro}`,
    `- Wissensstatus: Version ${article.revision ?? 'unbekannt'}, letzte Prüfung ${article.reviewedAt ?? 'unbekannt'}.`,
    `- Lizenzstatus: ${article.licenseStatus}`,
    `- Quellenkette: ${article.sourceChain}`,
    '',
  ]),
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
  `- Automatischer Index-Build: ${generatedAt}.`,
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

const prerenderedPaths = [...new Set([...staticPages.map((page) => page.path), ...guides.map((guide) => guide.path), ...parts.map((part) => part.path), ...wikiArticles.map((article) => article.path), '/admin'])];
const redirects = prerenderedPaths
  .filter((path) => path !== '/')
  .map((path) => `${path} ${path}/index.html 200`)
  .join('\n') + '\n';

writeFileSync(join(publicRoot, 'sitemap.xml'), sitemap);
writeFileSync(join(publicRoot, 'llms.txt'), llms);
writeFileSync(join(publicRoot, 'full-llms.txt'), fullLlms);
writeFileSync(join(publicRoot, 'llms-full.txt'), fullLlms);
writeFileSync(join(publicRoot, 'robots.txt'), robots);
writeFileSync(join(publicRoot, '_redirects'), redirects);

console.log(`SEO-Dateien erzeugt: ${guides.length} Reparaturhilfen, ${pdfFiles.length} PDFs, ${ownPaths.length} URLs (${siteOrigin})`);
