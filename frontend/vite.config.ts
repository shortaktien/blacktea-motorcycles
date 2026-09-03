import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const researchRoot = fileURLToPath(new URL('../research', import.meta.url));
const contentRoot = fileURLToPath(new URL('../content', import.meta.url));
const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const siteConfig = JSON.parse(readFileSync(new URL('./src/site-config.json', import.meta.url), 'utf8'));
const siteOrigin = (process.env.VITE_SITE_URL ?? siteConfig.siteOrigin).replace(/\/+$/, '');
const appSource = readFileSync(new URL('./src/App.tsx', import.meta.url), 'utf8');
const partsCatalog = JSON.parse(readFileSync(new URL('../research/parts.json', import.meta.url), 'utf8')) as { historical_product_slugs?: string[] };
const partDetailsCatalog = JSON.parse(readFileSync(new URL('../research/parts-details.json', import.meta.url), 'utf8')) as { entries?: Array<{ slug: string; ok: boolean; title?: string }> };
const guidePattern = /id:\s*'([^']+)',\s*path:\s*'([^']+)',\s*title:\s*'([^']+)',\s*model:\s*'([^']+)',\s*intro:\s*'([^']+)'/g;
const guides = [...appSource.matchAll(guidePattern)].map((match) => ({ path: match[2], title: match[3], description: match[5] }));
const mapFromApp = (name: string): Record<string, string> => {
  const block = appSource.match(new RegExp(`const ${name}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
  const entries: Record<string, string> = {};
  const entryPattern = /(?:'([^']+)'|([A-Za-z0-9_-]+)):\s*'([^']+)'/g;
  for (const match of block.matchAll(entryPattern)) entries[match[1] ?? match[2]] = match[3];
  return entries;
};
const partTitleOverrides = mapFromApp('partTitleOverrides');
const partWordOverrides = mapFromApp('partWordOverrides');
const humanizePartSlug = (slug: string) => partTitleOverrides[slug] ?? slug.replace(/^copy-of-/, '').split('-').map((word) => partWordOverrides[word] ?? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(' ');
const parts = (partsCatalog.historical_product_slugs ?? []).map((slug) => ({ path: `/ersatzteile/${slug}`, title: partDetailsCatalog.entries?.find((entry) => entry.slug === slug && entry.ok)?.title ?? humanizePartSlug(slug) }));
const routeMetadata: Record<string, { title: string; description: string; robots?: string }> = {
  '/': { title: 'Black Tea Hilfe — Dokumente, Ersatzteile & Updates', description: 'Unabhängige Sammelstelle für Black Tea Motorbikes: lokale PDFs, Ersatzteile, Reparaturhilfen und nachvollziehbare Quellen.' },
  '/hilfe': { title: 'Reparaturhilfe — Black Tea Hilfe', description: 'Redaktionell geordnete Reparaturhilfen für typische Bonfire- und Wildfire-Fehlerbilder — mit Kurzablauf, ausführlicher Prüfung, Sicherheit und Quelle.' },
  '/ersatzteile': { title: 'Ersatzteile — Black Tea Hilfe', description: 'Historischer BTM-Ersatzteilkatalog mit Modellbezug, Teilenamen und Quellen. Bestand und Preise vor dem Kauf prüfen.' },
  '/community': { title: 'BTM Community-Wissen — Black Tea Hilfe', description: 'Technische Hinweise aus der Black Tea Community verständlich zusammengefasst, mit lokalen PDFs und Originalquellen.' },
  '/quellen': { title: 'Quellen — Black Tea Hilfe', description: 'Nachvollziehbare Quellen zu Insolvenzstatus, Handbüchern, lokalen PDFs, Ersatzteilspuren und Community-Wissen.' },
  '/admin': { title: 'Admin — Black Tea Hilfe', description: 'Interner Bereich zur redaktionellen Prüfung von Kommentaren.', robots: 'noindex,nofollow,noarchive' },
  '/bikes/bonfire': { title: 'Bonfire — Bikes — Black Tea Hilfe', description: 'Technische Wiki-Seite zur Black Tea Bonfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
  '/bikes/wildfire': { title: 'Wildfire — Bikes — Black Tea Hilfe', description: 'Technische Wiki-Seite zur Black Tea Wildfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.' },
};
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

type PageMetadata = {
  title: string;
  description: string;
  robots?: string;
};

export default defineConfig({
  plugins: [
    {
      name: 'blacktea-site-meta',
      transformIndexHtml(html, context) {
        const requestedPath = new URL(context.originalUrl ?? context.path, 'http://localhost').pathname.replace(/\/index\.html$/, '') || '/';
        const guide = guides.find((item) => item.path === requestedPath);
        const part = parts.find((item) => item.path === requestedPath);
        const page: PageMetadata = guide
          ? { ...guide, title: `${guide.title} — Black Tea Hilfe` }
          : part
            ? { title: `${part.title} — Ersatzteil — Black Tea Hilfe`, description: `${part.title} für Black Tea Motorbikes: historischer BTM-Shop-Eintrag, Archivquelle und aktuelle Kaufoptionen zur Gegenprüfung.` }
            : (routeMetadata[requestedPath] ?? routeMetadata['/']);
        const canonical = `${siteOrigin}${requestedPath === '/' ? '/' : requestedPath}`;
        const robots = page.robots ?? 'index,follow,max-image-preview:large';
        let transformed = html
          .replaceAll('__SITE_ORIGIN__', siteOrigin)
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`)
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${page.description}" />`)
          .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${robots}" />`)
          .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${guide ? 'article' : 'website'}" />`)
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${page.title}" />`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${page.description}" />`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`)
          .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${page.title}" />`)
          .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${page.description}" />`)
          .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
        if (robots.startsWith('noindex')) {
          transformed = transformed.replace(/<script id="site-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, '');
        }
        return transformed;
      },
    },
    react(),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://backend:8000',
        changeOrigin: true,
      },
    },
    headers: securityHeaders,
    fs: {
      allow: [frontendRoot, researchRoot, contentRoot],
    },
  },
  preview: {
    headers: {
      ...securityHeaders,
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    },
  },
});
