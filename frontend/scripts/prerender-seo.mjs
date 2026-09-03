import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(frontendRoot, 'dist');
const wikiRoot = join(frontendRoot, '..', 'content', 'wiki');
const appSource = readFileSync(join(frontendRoot, 'src', 'App.tsx'), 'utf8');
const siteConfig = JSON.parse(readFileSync(join(frontendRoot, 'src', 'site-config.json'), 'utf8'));
const partsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts.json'), 'utf8'));
const partDetailsCatalog = JSON.parse(readFileSync(join(frontendRoot, '..', 'research', 'parts-details.json'), 'utf8'));
const siteOrigin = (process.env.VITE_SITE_URL || siteConfig.siteOrigin).replace(/\/+$/, '');
const indexPath = join(distRoot, 'index.html');
const serverEntryPath = join(frontendRoot, 'dist-server', 'entry-server.js');

const guidePattern = /id:\s*'([^']+)',\s*path:\s*'([^']+)',\s*title:\s*'([^']+)',\s*model:\s*'([^']+)',\s*intro:\s*'([^']+)',\s*steps:\s*\[([\s\S]*?)\]\s*,\s*safety:/g;
const guides = [...appSource.matchAll(guidePattern)].map((match) => ({
  id: match[1],
  path: match[2],
  title: match[3],
  model: match[4],
  intro: match[5],
  steps: [...match[6].matchAll(/'([^']+)'/g)].map((step) => step[1]),
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
  return {
    path: `/bikes/${articlePath}`,
    title: fields.title ?? articlePath,
    model: fields.model ?? 'Bikes',
    intro: fields.intro ?? 'Redaktionell aufbereiteter Wiki-Artikel aus lokal gesicherten Quellen.',
  };
};
const wikiArticles = collectMarkdownFiles(wikiRoot).map(parseWikiArticle).sort((left, right) => left.title.localeCompare(right.title, 'de'));

if (guides.length === 0 || !readFileSync(indexPath, 'utf8')) {
  throw new Error('Prerendering konnte keine App oder Reparaturhilfen finden.');
}

const staticPages = [
  { path: '/', title: 'Black Tea Motorbikes – Hilfe — Dokumente, Ersatzteile & Updates', description: 'Unabhängige Sammelstelle für Black Tea Motorbikes: lokale PDFs, Ersatzteile, Reparaturhilfen und nachvollziehbare Quellen.' },
  { path: '/hilfe', title: 'Reparaturhilfe — Black Tea Motorbikes – Hilfe', description: 'Redaktionell geordnete Reparaturhilfen für typische Bonfire- und Wildfire-Fehlerbilder — mit Kurzablauf, ausführlicher Prüfung, Sicherheit und Quelle.' },
  { path: '/hilfe/anfragen', title: 'Reparatur anfragen — Black Tea Motorbikes – Hilfe', description: 'Reparaturanfragen zu Black Tea Bonfire und Wildfire stellen, Erfahrungen teilen und gemeinsam nachvollziehbare Lösungen dokumentieren.' },
  { path: '/ersatzteile', title: 'Ersatzteile — Black Tea Motorbikes – Hilfe', description: 'Historischer BTM-Ersatzteilkatalog mit Modellbezug, Teilenamen und Quellen. Bestand und Preise vor dem Kauf prüfen.' },
  { path: '/community', title: 'BTM Community-Wissen — Black Tea Motorbikes – Hilfe', description: 'Technische Hinweise aus der Black Tea Community verständlich zusammengefasst, mit lokalen PDFs und Originalquellen.' },
  { path: '/quellen', title: 'Quellen — Black Tea Motorbikes – Hilfe', description: 'Nachvollziehbare Quellen zu Insolvenzstatus, Handbüchern, lokalen PDFs, Ersatzteilspuren und Community-Wissen.' },
  { path: '/impressum', title: 'Impressum — Black Tea Motorbikes – Hilfe', description: 'Anbieterinformationen und rechtliche Hinweise zu Black Tea Motorbikes – Hilfe.' },
  { path: '/datenschutz', title: 'Datenschutz — Black Tea Motorbikes – Hilfe', description: 'Datenschutzhinweise zu Kommentaren, Bildanhängen und dem Betrieb von Black Tea Motorbikes – Hilfe.' },
  { path: '/wiki', title: 'Wiki — Black Tea Motorbikes – Hilfe', description: 'Das BTM-Wiki enthält redaktionell geprüfte Artikel zu Bonfire und Wildfire und wird gemeinsam erweitert.' },
  { path: '/bikes/bonfire', title: 'Bonfire — Bikes — Black Tea Motorbikes – Hilfe', description: 'Technische Wiki-Seite zur Black Tea Bonfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
  { path: '/bikes/wildfire', title: 'Wildfire — Bikes — Black Tea Motorbikes – Hilfe', description: 'Technische Wiki-Seite zur Black Tea Wildfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
  { path: '/admin', title: 'Admin — Black Tea Motorbikes – Hilfe', description: 'Interner Bereich zur redaktionellen Prüfung von Kommentaren.', robots: 'noindex,nofollow,noarchive' },
  { path: '/login', title: 'Einloggen — Black Tea Motorbikes – Hilfe', description: 'In den persönlichen BTM-Hilfe-Bereich einloggen.', robots: 'noindex,nofollow,noarchive' },
  { path: '/registrieren', title: 'Registrieren — Black Tea Motorbikes – Hilfe', description: 'Ein persönliches BTM-Hilfe-Konto mit Mailjet-Bestätigung anlegen.', robots: 'noindex,nofollow,noarchive' },
  { path: '/konto', title: 'Mein Bereich — Black Tea Motorbikes – Hilfe', description: 'Persönliche Bike-Einstellungen und Benachrichtigungen bei BTM-Hilfe.', robots: 'noindex,nofollow,noarchive' },
];

const pages = [
  ...staticPages.map((page) => {
    const wikiArticle = wikiArticles.find((article) => article.path === page.path);
    return wikiArticle ? { ...page, wikiArticle } : page;
  }),
  ...wikiArticles
    .filter((article) => !staticPages.some((page) => page.path === article.path))
    .map((article) => ({ ...article, title: `${article.title} — ${article.model} — Black Tea Motorbikes – Hilfe`, description: article.intro, robots: 'index,follow,max-image-preview:large', wikiArticle: article })),
  ...guides.map((guide) => ({ ...guide, title: `${guide.title} — Black Tea Motorbikes – Hilfe`, description: guide.intro, robots: 'index,follow,max-image-preview:large', guide })),
  ...parts.map((part) => ({
    ...part,
    title: `${part.title} — Ersatzteil — Black Tea Motorbikes – Hilfe`,
    description: `${part.title} für Black Tea Motorbikes: historischer BTM-Shop-Eintrag mit lokal gesicherten Archivdaten und Bezugsstatus ohne unbestätigte Kaufempfehlung.`,
    robots: 'index,follow,max-image-preview:large',
    part,
  })),
];
const source = readFileSync(indexPath, 'utf8');
const { render } = await import(serverEntryPath);
const absoluteUrl = (path) => `${siteOrigin}${path === '/' ? '/' : path}`;
const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${siteOrigin}/#website`,
  name: 'Black Tea Motorbikes – Hilfe',
  url: `${siteOrigin}/`,
  inLanguage: 'de-DE',
};

const breadcrumbSchema = (page) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${siteOrigin}/` },
    ...(page.guide ? [
      { '@type': 'ListItem', position: 2, name: 'Reparaturhilfe', item: `${siteOrigin}/hilfe` },
      { '@type': 'ListItem', position: 3, name: page.guide.title, item: absoluteUrl(page.path) },
    ] : page.part ? [
      { '@type': 'ListItem', position: 2, name: 'Ersatzteile', item: `${siteOrigin}/ersatzteile` },
      { '@type': 'ListItem', position: 3, name: page.part.title, item: absoluteUrl(page.path) },
    ] : page.path !== '/' ? [{ '@type': 'ListItem', position: 2, name: page.title, item: absoluteUrl(page.path) }] : []),
  ],
});

const schemaFor = (page) => {
  if (page.robots?.startsWith('noindex')) return null;

  const pageSchema = page.guide ? {
    '@type': 'HowTo',
    '@id': `${absoluteUrl(page.path)}#howto`,
    name: page.guide.title,
    description: page.description,
    url: absoluteUrl(page.path),
    inLanguage: 'de-DE',
    step: page.guide.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: `Prüfschritt ${index + 1}`,
      text: step,
    })),
  } : page.part ? {
    '@type': 'Product',
    '@id': `${absoluteUrl(page.path)}#product`,
    name: page.part.title,
    description: page.description,
    url: absoluteUrl(page.path),
    category: 'Ersatzteil',
    sku: `btm-${page.part.id}`,
    brand: { '@type': 'Brand', name: 'Black Tea Motorbikes' },
  } : page.wikiArticle ? {
    '@type': 'Article',
    '@id': `${absoluteUrl(page.path)}#article`,
    headline: page.wikiArticle.title,
    description: page.description,
    url: absoluteUrl(page.path),
    inLanguage: 'de-DE',
    isPartOf: { '@id': `${siteOrigin}/#website` },
    about: { '@type': 'Vehicle', name: page.wikiArticle.model, brand: { '@type': 'Brand', name: 'Black Tea Motorbikes' } },
  } : {
    '@type': page.path === '/hilfe' || page.path === '/ersatzteile' || page.path === '/community' || page.path === '/quellen' ? 'CollectionPage' : 'WebPage',
    '@id': `${absoluteUrl(page.path)}#webpage`,
    name: page.title,
    description: page.description,
    url: absoluteUrl(page.path),
    inLanguage: 'de-DE',
    isPartOf: { '@id': `${siteOrigin}/#website` },
  };

  return { '@context': 'https://schema.org', '@graph': [websiteSchema, pageSchema, breadcrumbSchema(page)] };
};

const replaceTag = (html, pattern, replacement) => html.replace(pattern, replacement);

for (const page of pages) {
  let html = source;
  const renderedBody = render(page.path);
  const robots = page.robots || 'index,follow,max-image-preview:large';
  const canonical = absoluteUrl(page.path);
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeAttribute(page.title)}</title>`);
  html = replaceTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttribute(page.description)}" />`);
  html = replaceTag(html, /<meta name="robots"[^>]*>/, `<meta name="robots" content="${robots}" />`);
  html = replaceTag(html, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${page.guide ? 'article' : 'website'}" />`);
  html = replaceTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttribute(page.title)}" />`);
  html = replaceTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttribute(page.description)}" />`);
  html = replaceTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = replaceTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttribute(page.title)}" />`);
  html = replaceTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttribute(page.description)}" />`);
  html = replaceTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);

  const schema = schemaFor(page);
  const schemaTag = schema ? `<script id="site-jsonld" type="application/ld+json">${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}</script>` : '';
  html = replaceTag(html, /<script id="site-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, schemaTag);
  html = html.replace('<div id="root"></div>', `<div id="root">${renderedBody}</div>`);

  if (page.path === '/') {
    writeFileSync(indexPath, html);
    continue;
  }

  const routeDirectory = join(distRoot, ...page.path.split('/').filter(Boolean));
  mkdirSync(routeDirectory, { recursive: true });
  writeFileSync(join(routeDirectory, 'index.html'), html);
}

console.log(`SEO-Pre-rendering erzeugt: ${pages.length} HTML-Einstiege (${siteOrigin})`);
