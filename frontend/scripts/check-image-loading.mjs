import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const images = [...source.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
assert.ok(images.length > 0);
for (const tag of images) {
  assert.match(tag, /decoding="async"/, 'Images must decode asynchronously');
  assert.match(tag, tag.includes('className="hero-concept-image"') ? /loading="eager"/ : /loading="lazy"/, 'Only the initial hero image should load eagerly');
}
console.log(`Image loading: ${images.length} image renderers checked.`);
