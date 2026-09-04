import assert from 'node:assert/strict';
import { formatUserHandle, getMentionQuery, insertMention, splitMentions, splitUserText } from '../src/mentions.ts';

const id = 'a'.repeat(32);
assert.equal(formatUserHandle('lokalertestfahrer'), '@lokalertestfahrer');
assert.equal(formatUserHandle('@rider1'), '@rider1');
assert.equal(formatUserHandle('@@rider1'), '@rider1');
assert.equal(formatUserHandle('jörg'), '@jörg');
const mentions = [{ name: 'jörg', id }, { name: 'rider1', id }];
const linked = (text) => splitMentions(text, mentions).filter((part) => part.profileId);
assert.equal(linked('Hallo @rider1! Und (@JÖRG).').length, 2);
assert.equal(linked('mail@rider1.de https://example.invalid/@rider1 @rider1extra @rider1_name @rider1-long').length, 0);
assert.equal(linked('@unbekannt').length, 0);
assert.equal(linked('@rider1 @rider1').length, 2);
assert.equal(linked('@rider1')[0].profileId, id);
const xss = '<script>alert(1)</script> @rider1';
assert.equal(splitMentions(xss, mentions).map((part) => part.text).join(''), xss);
assert.equal(splitMentions('@rider1', [{ name: 'rider1', id: 'javascript:alert(1)' }])[0].profileId, undefined);
assert.equal(splitMentions('', mentions).length, 0);
console.log('Mention rendering: 8 checks passed.');

const origin = 'https://btm.shortaktien.de';
const parse = (text, origins = [origin]) => {
  const parts = splitUserText(text, mentions, origins);
  assert.equal(parts.map((part) => part.text).join(''), text, 'Preserve all original text');
  return parts;
};
const urls = (text, origins) => parse(text, origins).filter((part) => part.href);
for (const text of [
  `${origin}/bikes/bonfire#akku`,
  '/community?gruppe=wildfire#beitrag-123',
  'btm.shortaktien.de/faq',
  'HTTPS://BTM.SHORTAKTIEN.DE/faq',
]) {
  assert.equal(urls(text).length, 1, text);
  assert.equal(new URL(urls(text)[0].href, origin).origin, origin);
}
const external = [
  'https://example.com', 'www.example.com/test', '//example.com/faq',
  'https://btm.shortaktien.de.evil.example/faq',
  'https://btm.shortaktien.de@evil.example/faq',
  'https://evil.example@btm.shortaktien.de/faq',
  'https://btm.shortaktien.de:444/faq',
  'https://btm.shortaktien.de\\@evil.example/faq',
  '/\\evil.example/faq', 'javascript:alert(1)', 'data:text/html,test',
  'mailto:mail@example.com', 'https://example.com/?name=@rider1',
  'https://example.com/redirect?next=https://btm.shortaktien.de/faq',
  '[Klick](https://example.com)', '<a href="https://example.com">Link</a>',
  'http://localhost:5173/faq',
];
for (const text of external) {
  assert.equal(urls(text).length, 0, text);
  assert.equal(parse(text).filter((part) => part.profileId).length, 0, text);
}
assert.equal(urls(`Siehe (${origin}/faq).`)[0].text, `${origin}/faq`);
assert.equal(urls(`${origin}/wiki/test_(eins).`)[0].text, `${origin}/wiki/test_(eins)`);
assert.equal(urls(`${origin}//example.com`)[0].href, `${origin}//example.com`);
assert.equal(urls('/%2f%2fexample.com')[0].href, '/%2f%2fexample.com');
assert.equal(urls('/faq')[0].href, '/faq');
assert.equal(urls('Siehe btm.shortaktien.de.')[0].href, `${origin}/`);
assert.equal(urls('http://localhost:5173/faq', [origin, 'http://localhost:5173']).length, 1);
const mixed = parse(`@rider1 siehe /faq und https://example.com/?name=@rider1 sowie @JÖRG.`);
assert.equal(mixed.filter((part) => part.profileId).length, 2);
assert.equal(mixed.filter((part) => part.href).length, 1);
assert.ok(mixed.every((part) => !(part.href && part.profileId)), 'Never nest links');
assert.equal(parse('').length, 0);
console.log('Internal-only user links: URL allowlist, spoofing, punctuation and mention checks passed.');
assert.deepEqual(getMentionQuery('Hallo @L', 8), { start: 6, end: 8, query: 'l' });
for (const text of ['mail@l', 'https://example.com/@l', 'https://example.com/?name=@l', '@', '@rider_long', '@@l']) {
  assert.equal(getMentionQuery(text, text.length), null, text);
}
assert.equal(getMentionQuery('(@JÖ', 4).query, 'jö');
const query = getMentionQuery('Hallo @local und @jörg', 8);
assert.equal(insertMention('Hallo @local und @jörg', query, 'localhero').text, 'Hallo @localhero und @jörg');
assert.deepEqual(insertMention('@l', getMentionQuery('@l', 2), 'localhero'), { text: '@localhero ', caret: 11 });
assert.equal(insertMention('(@l)', getMentionQuery('(@l)', 3), 'localhero').text, '(@localhero)');
console.log('Mention autocomplete: query boundaries, Unicode, insertion and caret checks passed.');
