import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { getPageSeo, webMcpKnowledgeEntries } from '../dist-server/entry-server.js';
import { searchBtmKnowledge } from '../src/webmcp-search.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const guides = JSON.parse(read('../content/owner-help.json')).pages;
const faqContent = JSON.parse(read('../content/faq.json'));
const faq = faqContent.items;
const manifest = JSON.parse(read('dist/open-knowledge.json'));
const sitemap = read('dist/sitemap.xml');
const htmlFor = (path) => read(`dist${path === '/' ? '' : path}/index.html`);
const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');

// Every indexed HTML route must agree with the metadata used after hydration.
let routes = 0;
for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(match[1]).pathname;
  if (path.startsWith('/pdfs/')) continue;
  const html = htmlFor(path);
  const seo = getPageSeo(path);
  assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)[1]), seo.title, `${path}: title drift`);
  assert.equal(decode(html.match(/<meta name="description" content="([^"]*)"/)[1]), seo.description, `${path}: description drift`);
  assert.deepEqual(JSON.parse(html.match(/<script id="site-jsonld"[^>]*>(.*?)<\/script>/s)[1]), seo.jsonLd, `${path}: schema drift`);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${path}: exactly one H1`);
  if (process.env.LINKTEST_BASE_URL) {
    const response = await fetch(new URL(path, process.env.LINKTEST_BASE_URL), { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, `${path}: HTTP status`);
    const served = await response.text();
    assert.equal(served.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1], html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1], `${path}: HTTP must serve this page, not the homepage fallback`);
    assert.equal(decode(served.match(/<title>(.*?)<\/title>/s)[1]), seo.title, `${path}: HTTP metadata`);
  }
  routes++;
}

for (const page of guides) {
  const html = htmlFor(page.path);
  assert.ok(sitemap.includes(page.path));
  assert.ok(read('dist/llms-full.txt').includes(page.summary));
  assert.ok(manifest.entries.some((entry) => new URL(entry.url).pathname === page.path));
  for (const section of page.sections) {
    assert.ok(html.includes(`id="${section.id}"`));
    assert.ok(decode(html).includes(section.paragraphs[0]), 'Answers must exist without JavaScript');
    for (const { href } of section.links) {
      if (!href.startsWith('/')) continue;
      const url = new URL(href, 'https://btm.shortaktien.de');
      const file = url.pathname.includes('.') ? `dist${url.pathname}` : `dist${url.pathname}/index.html`;
      assert.ok(existsSync(join(root, file)), `Missing destination ${href}`);
      if (url.hash) assert.ok(read(file).includes(`id="${url.hash.slice(1)}"`), `Missing anchor ${href}`);
    }
  }
}

for (const entry of manifest.entries.filter((entry) => entry.kind === 'part')) {
  const html = htmlFor(new URL(entry.url).pathname);
  assert.ok(html.includes(entry.lastReviewed), `${entry.title}: manifest review date must match visible provenance`);
}

assert.equal(new Set(faq.map((item) => item.id)).size, faq.length, 'FAQ IDs must be unique');
for (const item of faq) {
  assert.match(item.id, /^[a-z0-9-]+$/);
  assert.ok(htmlFor('/faq').includes(`id="${item.id}"`));
  const entry = webMcpKnowledgeEntries.find((entry) => entry.kind === 'faq' && entry.title === item.question);
  assert.equal(entry.href, `/faq#${item.id}`, 'Search must point to the actual answer');
}

// A newly verified case status must not leave the previously provisional FAQ
// answer or the filing deadline out of sync with the dedicated owner guide.
const insolvencyGuide = guides.find((page) => page.path === '/insolvenz');
const insolvencyFaq = faq.find((item) => item.id === 'insolvenzstatus');
const claimsFaq = faq.find((item) => item.id === 'forderung-anmelden');
assert.ok(insolvencyGuide && insolvencyFaq && claimsFaq);
assert.ok(faqContent.lastUpdated >= insolvencyGuide.reviewedAt, 'FAQ review must cover the latest case-status update');
assert.doesNotMatch(insolvencyFaq.answer, /Eröffnungsbeschluss wurde hier nicht amtlich verifiziert/);
assert.match(insolvencyFaq.answer, /1513 IN 2588\/26/);
assert.match(insolvencyFaq.answer, /5\. Oktober 2026/);
assert.match(claimsFaq.answer, /24\. November 2026/);
assert.match(insolvencyGuide.summary, /24\.11\.2026/);
assert.ok(faq.some((item) => item.id === 'amtlichen-beschluss-finden' && item.linkHref === '/insolvenz#originalbeschluss'));

// The portal's text URL needs a prior search session; never publish it as a permalink.
for (const path of ['/', '/insolvenz', '/faq', '/quellen']) {
  const html = htmlFor(path);
  assert.doesNotMatch(html, /href="https:\/\/neu\.insolvenzbekanntmachungen\.de\/ap\/text\.xhtml/, `${path}: session-dependent source link`);
  const sourceDestination = path === '/' ? '/insolvenz#originalbeschluss' : 'https://neu.insolvenzbekanntmachungen.de/ap/';
  assert.ok(html.includes(sourceDestination), `${path}: source or local original-text excerpt must be linked`);
}
assert.match(htmlFor('/insolvenz'), /href="#originalbeschluss">Amtlichen Originaltext/);
assert.doesNotMatch(decode(htmlFor('/insolvenz')), /So findest du den Originaltext:/);
const originalQuote = insolvencyGuide.sections.find((section) => section.sourceQuote)?.sourceQuote;
assert.ok(originalQuote);
assert.match(htmlFor('/insolvenz'), /<blockquote cite="https:\/\/neu\.insolvenzbekanntmachungen\.de\/ap\/"/);
for (const paragraph of originalQuote.paragraphs) {
  assert.ok(decode(htmlFor('/insolvenz')).includes(paragraph), 'Original quote must be readable without JavaScript');
}

// All 13 crawled but excluded core pages must have working static links and
// exact anchors, including the quick-start references in long model articles.
for (const path of ['/', '/insolvenz', '/faq', '/bikes/bonfire', '/bikes/wildfire', '/wiki', '/hilfe/controller', '/hilfe', '/werkstaetten', '/hilfe/akku-bms', '/ersatzteile', '/hilfe/ersatzteil-finden', '/community']) {
  const html = htmlFor(path);
  const headingIds = [...html.matchAll(/<h[2-4][^>]*id="([^\"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(headingIds).size, headingIds.length, `${path}: headings must have unique anchors`);
  for (const href of [...html.matchAll(/href="([^\"]+)"/g)].map((match) => decode(match[1]))) {
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const url = new URL(href, `https://btm.shortaktien.de${path}`);
    // PDFs are intentionally not tracked; production keeps the archive separately.
    // The dedicated SEO test validates local files when they are available.
    if (url.pathname.startsWith('/pdfs/') && url.pathname.endsWith('.pdf')) {
      assert.ok(read('dist/pdfs/index.html').includes(url.pathname), `${path}: PDF must be listed in the archive ${href}`);
      continue;
    }
    const file = url.pathname === '/' ? 'dist/index.html' : url.pathname.includes('.') ? `dist${url.pathname}` : `dist${url.pathname}/index.html`;
    assert.ok(existsSync(join(root, file)), `${path}: missing core-page link ${href}`);
    if (url.hash) assert.ok(read(file).includes(`id="${url.hash.slice(1)}"`), `${path}: missing core-page anchor ${href}`);
  }
}
assert.match(htmlFor('/bikes/bonfire'), /<h3 id="bremsen-2"/, 'Repeated Bonfire heading must match the TOC target');
for (const [query, scope, href] of [
  ['Black Tea Insolvenz', 'owner', '/insolvenz'],
  ['Werkstattkontakt', 'owner', '/hilfe/werkstatt-vorbereiten'],
  ['CT-22', 'part', '/ersatzteile/display'],
  ['Ist Black Tea Motorbikes insolvent', 'faq', '/faq#insolvenzstatus'],
]) {
  const result = JSON.parse(searchBtmKnowledge(webMcpKnowledgeEntries, 'https://btm.shortaktien.de', query, scope));
  assert.ok(result.results.some((entry) => entry.url === `https://btm.shortaktien.de${href}`), `${query}: actual production search must find ${href}`);
}
assert.match(htmlFor('/ersatzteile/display'), /Teileanfrage für Display/);
assert.match(htmlFor('/profil'), /name="robots" content="noindex,follow,noarchive"/);
assert.doesNotMatch(htmlFor('/profil'), /rel="canonical"|id="site-jsonld"/);
console.log(`Besitzerhilfe geprüft: ${routes} HTML-Routen mit konsistenten Metadaten, ${guides.length} Leitfäden, ${faq.length} FAQ-Direktlinks und 4 echte Suchintentionen.`);
