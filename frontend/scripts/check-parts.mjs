import assert from 'node:assert/strict';
import { render } from '../dist-server/entry-server.js';

// Exercise the actual rendered catalog after `npm run build`, including candidates
// with no Amazon URL (specialist suppliers) and multi-marketplace alternatives.
const page = (slug) => render(`/ersatzteile/${slug}`).replace(/<!--[\s\S]*?-->/g, '');
const buyCards = (html) => [...html.matchAll(/<a\b[^>]*class="part-buy-card[^>]*>[\s\S]*?<\/a>/g)].map(([card]) => card);
const dcdc = page('dcdc-converter');
assert.match(dcdc, /<details class="repair-comments-disclosure"><summary class="repair-comments-heading repair-comments-summary">/);
assert.doesNotMatch(dcdc, /<details[^>]*\bopen(?:=|\s|>)/, 'Parts comments start collapsed');
assert.match(dcdc, /Aufklappen \+/);
assert.match(dcdc, /Zuklappen −/);
const cards = buyCards(dcdc);
assert.equal(cards.length, 2);
assert.match(cards[0], /amazon\.de\/dp\/B0DK94C25L/);
assert.match(cards[0], /Amazon · Ausführung prüfen/);
assert.match(cards[0], /75–150 V auf 13,8 V \/ 10 A/);
assert.match(cards[1], /aliexpress\.com\/item\/1005006630139887/);
assert.match(cards[1], /AliExpress · Ausführung prüfen/);
assert.doesNotMatch(cards[1], /Amazon/);
assert.match(cards[1], /nicht live verifiziert/);
assert.match(dcdc, /30–110 V/);
assert.match(dcdc, /117 V/);
assert.match(dcdc, /04\.09\.2026/);
assert.match(dcdc, /<strong>Modell<\/strong>Bonfire \/ Wildfire/);
assert.doesNotMatch(dcdc, /parts-detail-source/);
assert.equal(dcdc.split('Der DC/DC-Wandler versorgt').length - 1, 1, 'Do not repeat the editorial summary as archived shop data');
assert.doesNotMatch(dcdc, /✓ Vorhanden|part-technical-evidence/);

for (const slug of ['speiche-mit-nippel', 'hub-motor']) {
  const html = page(slug);
  const suppliers = buyCards(html);
  assert.equal(suppliers.length, 2, `${slug}: supplier options without Amazon must render`);
  for (const card of suppliers) {
    assert.match(card, /Hersteller \/ Fachhandel · Ausführung prüfen/);
    assert.doesNotMatch(card, /Amazon/);
    assert.match(card, /rel="nofollow noreferrer"/);
  }
}
assert.match(page('hub-motor'), /ND96680/);
assert.match(page('hub-motor'), /115 V/);
assert.match(page('speiche-mit-nippel'), /nicht automatisch M4/);
assert.match(page('bremszylinder'), /<h1>Bremssattel<\/h1>/);
assert.match(page('bremszylinder-und-hebel'), /Hauptbremszylinder am Lenker/);
assert.match(page('bremsbelage'), /Wildfire mit CBS noch nicht als passend bestätigt/);
assert.match(buyCards(page('bremsbelage'))[0], /B0068NSX98/);
assert.match(page('usd-gabelset'), /keine verlässliche Modellzuordnung/);
assert.match(buyCards(page('dual-sport-reifen-upgrade'))[0], /Amazon · Handbuchabgleich/);
console.log('Ersatzteiltests erfolgreich: Varianten, Lieferantenlabels, Passformgrenzen und bestehende Amazon-Links.');
