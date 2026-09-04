import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Build and exercise the real production image, not Vite's permissive SPA
// fallback. The container has no application data, credentials or fixed port.
const root = fileURLToPath(new URL('../../', import.meta.url));
const image = 'btm-frontend-routing-check';
const docker = (...args) => execFileSync('docker', args, { cwd: root, encoding: 'utf8' }).trim();
execFileSync('docker', ['build', '-f', 'frontend/Dockerfile.prod', '-t', image, '.'], { cwd: root, stdio: 'inherit' });
let container;
try {
  container = docker('run', '--rm', '-d', '-p', '127.0.0.1::80', image);
  assert.match(container, /^[a-f0-9]{64}$/);
  const binding = docker('port', container, '80/tcp');
  assert.match(binding, /^127\.0\.0\.1:\d+$/);
  const base = `http://${binding}`;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await fetch(base, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; }
    } catch { /* Container may still be starting. */ }
    await delay(300);
  }
  assert.ok(ready, 'Production Caddy must start');

  const profile = '/profil/f85e1acd92a1741d2ca231d79b2c1a5d';
  for (const suffix of ['', '/', '?test=direct']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${base}${profile}${suffix}`, { method, redirect: 'manual' });
      assert.equal(response.status, 200, `${method} ${profile}${suffix}`);
      assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/);
      assert.doesNotMatch(response.headers.get('content-disposition') ?? '', /attachment/i);
      assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
      if (method === 'GET') {
        const html = await response.text();
        assert.match(html, /<div id="root"><\/div>/, 'Dedicated client-only shell');
        assert.match(html, /<script[^>]*type="module"[^>]*src="\/assets\//);
        assert.match(html, /<meta name="robots" content="noindex,follow,noarchive"/);
        assert.doesNotMatch(html, /rel="canonical"|id="site-jsonld"/);
        assert.doesNotMatch(html, /f85e1acd92a1741d2ca231d79b2c1a5d/);
      }
    }
  }

  for (const path of ['/konto', '/login', '/community', '/ersatzteile', '/hilfe/anfragen', '/hilfe/anfragen/6c34f725fb1e9bb5a063ba060a2355e8']) {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/, path);
  }
  for (const path of ['/profil/invalid', `${profile}0`, `${profile}/extra`, '/not-a-real-route']) {
    assert.equal((await fetch(`${base}${path}`, { redirect: 'manual' })).status, 404, path);
  }
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.doesNotMatch(sitemap, /\/profil(?:\/|<)/, 'Profiles must not enter the sitemap');
  const shell = await (await fetch(`${base}${profile}`)).text();
  const asset = shell.match(/<script[^>]*src="([^\"]+)"/)?.[1];
  assert.ok(asset?.startsWith('/assets/'));
  assert.equal((await fetch(`${base}${asset}`)).status, 200, 'Profile JavaScript asset is reachable');
  console.log('Production routing passed: public profile HTML, GET/HEAD, trailing slash, assets, noindex, existing routes and strict 404s.');
} finally {
  if (container && /^[a-f0-9]{64}$/.test(container)) docker('stop', container);
}
