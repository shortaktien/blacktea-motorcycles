import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, '..');
const distRoot = join(frontendRoot, 'dist');
const publicRoot = join(frontendRoot, 'public');
const siteOrigin = (process.env.SEO_SITE_ORIGIN ?? 'https://btm.shortaktien.de').replace(/\/$/, '');
const httpOrigin = process.env.LINKTEST_BASE_URL?.replace(/\/$/, '') ?? '';
const failures = [];
let checks = 0;

function fail(message) {
  failures.push(message);
}

function pathToDistFile(pathname) {
  const decodedPath = decodeURIComponent(pathname || '/');
  const routePath = decodedPath.endsWith('/')
    ? `${decodedPath}index.html`
    : extname(decodedPath) ? decodedPath : `${decodedPath}/index.html`;
  const filePath = resolve(distRoot, `.${routePath}`);
  const distPrefix = `${distRoot}${sep}`;
  if (filePath !== distRoot && !filePath.startsWith(distPrefix)) {
    throw new Error(`Pfad verlässt dist: ${pathname}`);
  }
  return filePath;
}

function internalPath(value) {
  const url = new URL(value, siteOrigin);
  if (url.origin !== siteOrigin) return null;
  return `${url.pathname}${url.search}`;
}

function assertDistFile(pathname, label) {
  let filePath;
  try {
    filePath = pathToDistFile(new URL(pathname, siteOrigin).pathname);
  } catch (error) {
    fail(`${label}: ${error.message}`);
    return null;
  }

  checks += 1;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(`${label}: fehlt (${relative(frontendRoot, filePath)})`);
    return null;
  }
  return filePath;
}

async function assertHttpPath(pathname, label) {
  if (!httpOrigin) return;
  const url = new URL(pathname, `${httpOrigin}/`);
  checks += 1;
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      fail(`${label}: HTTP ${response.status} (${url.pathname})`);
    }
    await response.body?.cancel();
  } catch (error) {
    fail(`${label}: ${error.message}`);
  }
}

function readDistText(pathname, label) {
  const filePath = assertDistFile(pathname, label);
  if (!filePath) return '';
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    fail(`${label}: nicht lesbar (${error.message})`);
    return '';
  }
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s)<>"']+/g)]
    .map(([value]) => value.replace(/[.,;:!?]+$/, ''));
}

async function checkSitemap() {
  const sitemap = readDistText('/sitemap.xml', 'Sitemap');
  const locations = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);
  if (locations.length === 0) {
    fail('Sitemap: keine <loc>-Einträge gefunden');
    return;
  }

  if (new Set(locations).size !== locations.length) {
    fail('Sitemap: doppelte URLs gefunden');
  }

  for (const location of locations) {
    const path = internalPath(location);
    if (!path) {
      fail(`Sitemap: fremde oder ungültige URL (${location})`);
      continue;
    }
    const pathname = new URL(location).pathname;
    const filePath = assertDistFile(pathname, `Sitemap-Link ${pathname}`);
    await assertHttpPath(path, `Sitemap-Link ${pathname}`);
    if (filePath && filePath.toLowerCase().endsWith('.html')) {
      const html = readFileSync(filePath, 'utf8');
      if (/name=["']robots["'][^>]*content=["']noindex/i.test(html) || /content=["']noindex[^"']*["'][^>]*name=["']robots["']/i.test(html)) {
        fail(`Sitemap-Link ${pathname}: zeigt auf eine noindex-Seite`);
      }
    }
  }

  for (const privatePath of ['/login', '/registrieren', '/konto', '/passwort-zuruecksetzen']) {
    if (locations.some((location) => new URL(location).pathname === privatePath)) {
      fail(`Sitemap: private Auth-Route darf nicht enthalten sein (${privatePath})`);
    }
  }
}

async function checkLlmFiles() {
  for (const pathname of ['/llms.txt', '/llms-full.txt', '/full-llms.txt']) {
    const content = readDistText(pathname, `LLM-Datei ${pathname}`);
    if (content.trim().length < 40) {
      fail(`LLM-Datei ${pathname}: unerwartet leer oder zu kurz`);
    }
    await assertHttpPath(pathname, `LLM-Datei ${pathname}`);

    for (const url of extractUrls(content)) {
      const path = internalPath(url);
      if (!path) continue;
      const pathnameOnly = new URL(url).pathname;
      assertDistFile(pathnameOnly, `LLM-Link ${pathnameOnly}`);
      await assertHttpPath(path, `LLM-Link ${pathnameOnly}`);
    }
  }
}

async function checkPdfArchive() {
  const indexPath = '/pdfs/index.html';
  const index = readDistText(indexPath, 'PDF-Index');
  await assertHttpPath('/pdfs/', 'PDF-Verzeichnis');
  await assertHttpPath(indexPath, 'PDF-Index');

  const sourcePdfs = readdirSync(join(publicRoot, 'pdfs'))
    .filter((file) => file.toLowerCase().endsWith('.pdf'))
    .sort();
  const linkedPdfs = [...index.matchAll(/href=["'](\/pdfs\/[^"']+\.pdf)["']/gi)]
    .map((match) => decodeURIComponent(new URL(match[1], siteOrigin).pathname.split('/').pop()));

  if (linkedPdfs.length === 0) {
    fail('PDF-Index: keine PDF-Links gefunden');
  }

  // Die PDF-Dateien werden aus Lizenz- und Betriebsgründen nicht im Git-Checkout
  // mitgeführt. Auf dem VPS liegen sie separat; lokal können sie optional für
  // die zusätzliche Datei- und Headerprüfung vorhanden sein.
  if (sourcePdfs.length > 0) {
    if (linkedPdfs.length !== sourcePdfs.length) {
      fail(`PDF-Index: ${linkedPdfs.length} PDF-Links für ${sourcePdfs.length} lokale PDFs gefunden`);
    }

    const linkedPdfSet = new Set(linkedPdfs);
    for (const file of sourcePdfs) {
      if (!linkedPdfSet.has(file)) {
        fail(`PDF-Index: lokales PDF nicht verlinkt (${file})`);
      }
    }
  } else {
    console.log(`PDF-Archiv: ${linkedPdfs.length} Links im Index gefunden; lokale PDFs werden separat verwaltet.`);
  }

  for (const file of sourcePdfs) {
    const pathname = `/pdfs/${file}`;
    const filePath = assertDistFile(pathname, `PDF ${file}`);
    await assertHttpPath(pathname, `PDF ${file}`);
    if (filePath) {
      const header = readFileSync(filePath).subarray(0, 4).toString('ascii');
      if (header !== '%PDF') {
        fail(`PDF ${file}: kein gültiger PDF-Header`);
      }
    }
  }
}

async function checkAuthRoutes() {
  const routes = ['/login', '/registrieren', '/konto', '/passwort-zuruecksetzen'];
  for (const pathname of routes) {
    const html = readDistText(pathname, `Auth-Route ${pathname}`);
    if (!/name=["']robots["'][^>]*content=["']noindex,nofollow,noarchive["']/i.test(html)) {
      fail(`Auth-Route ${pathname}: noindex-Meta fehlt oder ist falsch`);
    }
    if (!/<title>[^<]+<\/title>/i.test(html)) {
      fail(`Auth-Route ${pathname}: Title fehlt`);
    }
    if (/\/@vite\/client|@react-refresh|\/src\/main\.tsx/i.test(html)) {
      fail(`Auth-Route ${pathname}: Vite-Dev-Marker im Produktions-HTML`);
    }
    await assertHttpPath(pathname, `Auth-Route ${pathname}`);
  }
  await assertHttpPath('/passwort-zuruecksetzen?token=link-test', 'Auth-Route Passwort-Reset mit Token');
}

if (!existsSync(distRoot)) {
  fail('Build-Ausgabe dist/ fehlt. Zuerst npm run build ausführen.');
} else {
  await checkSitemap();
  await checkLlmFiles();
  await checkPdfArchive();
  await checkAuthRoutes();
}

if (failures.length > 0) {
  console.error(`SEO-Linktest fehlgeschlagen (${failures.length} Fehler bei ${checks} Checks):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`SEO-Linktest erfolgreich: ${checks} Checks für Sitemap, LLM-Dateien, PDF-Archiv und Auth-Routen.`);
}
