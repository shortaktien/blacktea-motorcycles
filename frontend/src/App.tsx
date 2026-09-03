import { createContext, useContext, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import partsCatalog from '../../research/parts.json';
import partDetailsCatalog from '../../research/parts-details.json';
import siteConfig from './site-config.json';

type CardKind = 'Dokument' | 'Ersatzteil' | 'Community';
type Filter = 'Alle' | CardKind;

type Resource = {
  kind: CardKind;
  title: string;
  description: string;
  label: string;
  href: string;
  tags: string[];
  external?: boolean;
  guidePath?: string;
  sourceHref?: string;
  sourceLabel?: string;
};

type RepairSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type RepairGuide = {
  id: string;
  path: string;
  title: string;
  model: string;
  intro: string;
  steps: string[];
  safety: string;
  sourceLabel: string;
  sourceHref: string;
  detailSections: RepairSection[];
};

type WikiArticle = {
  slug: string;
  path: string;
  title: string;
  model: string;
  intro: string;
  status: string;
  sourceHref?: string;
  sourceLabel?: string;
  body: string;
};

type WikiTocItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

type FeedbackSummary = {
  guide: string;
  up: number;
  down: number;
  comments: PublicComment[];
};

type PublicComment = {
  id: string;
  kind?: 'comment' | 'wiki_suggestion' | 'repair_request' | 'repair_answer';
  name: string;
  body: string;
  topic?: string | null;
  section?: string | null;
  source?: string | null;
  parentId?: string | null;
  createdAt: string;
  imageUrl: string | null;
  avatarStyle?: number | null;
  avatarUrl?: string | null;
};

type AdminComment = PublicComment & {
  guide: string;
  email: string;
  status: 'pending' | 'approved';
  approvedAt: string | null;
};

type AdminWarning = {
  id: string;
  reason: string;
  createdAt: string;
};

type AdminMember = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'moderator' | string;
  status: 'active' | 'awaiting_confirmation' | string;
  model: 'Bonfire' | 'Wildfire' | null;
  kilometers: number;
  createdAt: string;
  emailConfirmedAt: string | null;
  newsletterSubscribed: boolean;
  warningCount: number;
  warnings: AdminWarning[];
  communicationBlocked: boolean;
  communicationBlockedAt: string | null;
};

type AdminNotificationSettings = {
  comments: boolean;
  wiki: boolean;
  repair: boolean;
  bugs: boolean;
  registration: boolean;
};

type SourcingCard = {
  title: string;
  category: string;
  status: string;
  summary: string;
  amazon?: { label: string; href: string };
  fallback?: { label: string; href: string };
};

type PartCategory = 'Bremsen' | 'Fahrwerk & Räder' | 'Elektrik & Laden' | 'Antrieb & Controller' | 'Karosserie & Halter' | 'Bundles' | 'Zubehör';
type PartsFilter = 'Alle' | PartCategory;

type PartResearchEntry = {
  id?: string;
  part_name?: string;
  category?: string;
  model_family?: string[];
  variants?: string[];
  historical_price_eur?: number;
  historical_old_price_eur?: number;
  specification_lead?: string;
  compatibility_note?: string;
  source_type?: string;
  source_url?: string;
  archive_lookup?: string;
  amazon_url?: string;
  amazon_search_url?: string;
  fallbacks?: Array<{ name: string; url: string; fit_status?: string }>;
  supplier_link?: string;
  supplier_leads?: string[];
  service_leads?: string[];
  confidence?: string;
  safety_class?: string;
  purchase_status?: 'confirmed' | 'manual-match' | 'candidate' | 'not-found';
  purchase_note?: string;
  purchase_heading?: string;
  purchase_options?: Array<{ name: string; url: string; fit_status?: string }>;
  rights_status?: string;
};

type ArchivedPartDetail = {
  slug: string;
  archive: string;
  timestamp?: string;
  ok: boolean;
  title?: string;
  description?: string;
  price_min_eur?: number;
  price_max_eur?: number;
  available?: boolean;
  variants?: Array<{ title?: string; name?: string; price_eur?: number; available?: boolean; sku?: string | null }>;
};

type HistoricalShopPart = {
  id: string;
  path: string;
  title: string;
  category: PartCategory;
  model: string;
  price?: number;
  priceMax?: number;
  variants?: string[];
  variantDetails?: Array<{ label: string; price?: number; available?: boolean }>;
  archiveHref: string;
  historicalSummary: string;
  compatibilityNote: string;
  confidence: string;
  safetyClass: string;
  purchaseStatus: 'confirmed' | 'manual-match' | 'candidate' | 'not-confirmed';
  purchaseNote: string;
  purchaseHeading?: string;
  purchaseOptions?: Array<{ label: string; href: string; fitStatus?: string }>;
  technicalEvidence?: { text: string; href: string; label: string; eyebrow?: string };
  amazonHref?: string;
  amazonLabel?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
  fallbackFitStatus?: string;
  archiveTimestamp?: string;
  historicalAvailability: string;
};

type CommunityKnowledge = {
  title: string;
  model: string;
  intro: string;
  points: string[];
  sourceLabel: string;
  sourceHref: string;
};

type AuthNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

type StaffChatMessage = {
  id: string;
  authorName: string;
  authorRole: 'admin' | 'moderator' | string;
  body: string;
  createdAt: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'moderator' | string;
  model: 'Bonfire' | 'Wildfire' | null;
  kilometers: number;
  avatarStyle: number;
  avatarUrl: string | null;
  notifyReplies: boolean;
  newsletterSubscribed: boolean;
  notifications: AuthNotification[];
};

type AuthContextValue = {
  user: AuthUser | null;
  csrfToken: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirm: string) => Promise<string>;
  logout: () => Promise<void>;
  updateProfile: (profile: Pick<AuthUser, 'name' | 'model' | 'kilometers' | 'notifyReplies' | 'newsletterSubscribed'>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const localPartArchiveHref = '/quellen#ersatzteil-archiv';
const repairRequestGuideSlug = 'hilfe-anfragen';
const repairRequestPath = '/hilfe/anfragen';
const repairRequestDetailPrefix = `${repairRequestPath}/`;
const repairRequestDetailPath = (id: string) => `${repairRequestPath}/${id}`;
const getRepairRequestId = (path: string) => {
  if (!path.startsWith(repairRequestDetailPrefix)) return null;
  const id = path.slice(repairRequestDetailPrefix.length);
  return /^[a-f0-9]{32}$/.test(id) ? id : null;
};

const sourceLinks = [
  {
    title: 'Verfahrensstatus',
    detail: 'Versteigerungskalender · Aktenzeichen 1513 IN 2588/26',
    href: 'https://www.versteigerungskalender.de/insolvenzkalender/blaeck-tea-motorbikes-gmbh',
  },
  {
    title: 'MOTORRAD Online · Bonfire und Wildfire',
    detail: 'Retro-E-Motorräder aus München · veröffentlicht am 02.09.2026',
    href: 'https://www.motorradonline.de/elektro/retro-e-motorraeder-black-tea-bonfire-und-wildfire-a1-und-b196/',
  },
  {
    title: 'Bonfire-Handbuch',
    detail: 'Lokale Kopie des gesicherten 44-seitigen Handbuchs',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
  },
  {
    title: 'Wildfire-Datenblätter',
    detail: 'Lokaler PDF-Index mit Schaltplänen, Software und Datenblättern',
    href: '/pdfs/index.html',
  },
  {
    title: 'Technische Daten',
    detail: 'ADAC Motorradkatalog · Bonfire X',
    href: 'https://www.adac.de/rund-ums-fahrzeug/zweirad/motorrad-roller/motorradkatalog/marken/black-tea/black-tea-bonfire-x-11066/',
  },
  {
    title: 'Lokale PDF-Sammlung',
    detail: 'Alle derzeit gesicherten Dokumente auf dieser Website',
    href: '/pdfs/index.html',
  },
  {
    title: 'ElektroRoller-Forum',
    detail: 'Community-Unterforum mit Selbsthilfe und Ersatzteilspuren',
    href: 'https://www.elektroroller-forum.de/viewforum.php?f=159',
  },
  {
    title: 'BTM Community',
    detail: 'Unabhängige Community-Aufbereitung für Bonfire und Wildfire',
    href: 'https://btm-community.org/',
  },
  {
    title: 'Ersatzteil-Archiv',
    detail: 'Lokal gesicherte Produktnamen, Beschreibungen, Varianten und historische Preise',
    href: localPartArchiveHref,
  },
];

const partTitleOverrides: Record<string, string> = {
  'alu-topcase': 'Alu-Topcase',
  'bar-end-mirrors': 'Lenkerendenspiegel',
  bearings: 'Lager',
  'change-the-color-of-my-off-road-protection': 'Farbauswahl Offroad-Schutz',
  'classic-indicator': 'Klassische Blinker',
  'classic-mirrors': 'Klassische Spiegel',
  'dcdc-converter': 'DC/DC-Wandler',
  'dual-sport-reifen-upgrade': 'Dual-Sport-Reifen-Upgrade',
  'enduro-fender': 'Enduro-Kotflügel',
  'fork-stabiliser': 'Gabelstabilisator',
  'front-wheel': 'Vorderrad',
  'foot-pegs-set': 'Fußrasten-Set',
  'gasdruck-federbeine': 'Gasdruck-Federbeine',
  'goldene-usd-gabel': 'Goldene USD-Gabel',
  'handlebar-crash-bars': 'Lenker-Sturzbügel',
  'handlebar-risers': 'Lenkererhöhung',
  headlight: 'Scheinwerfer',
  'headlight-grill': 'Scheinwerfergitter',
  'hub-motor': 'Radnabenmotor',
  'key-set': 'Schlüsselsatz',
  'keyless-go': 'Keyless Go',
  'keyless-go-retro-fit': 'Keyless-Go-Retrofit',
  'kill-switch': 'Kill-Switch',
  'light-holder': 'Scheinwerferhalter',
  'modern-bundle': 'Modern-Bundle',
  'moped-license-plate-holder': 'Moped-Kennzeichenhalter',
  'nfc-karte-nachrustkit': 'NFC-Karte / Nachrüstkit',
  'off-road-bundle': 'Offroad-Bundle',
  'off-road-schutz': 'Offroad-Schutz',
  'passenger-hold': 'Soziushalter',
  'performance-bundle': 'Performance-Bundle',
  'range-extender-bundle': 'Reichweiten-Bundle',
  'rear-light': 'Rücklicht',
  'rear-rack': 'Gepäckträger hinten',
  'reparatur-qs8s-stecker': 'QS8-S-Stecker-Reparatur',
  'retro-windschild': 'Retro-Windschild',
  'ride-mode-button': 'Fahrmodi-Taster',
  schaltereinheit: 'Schaltereinheit',
  'scheinwerfer-retrofit': 'Scheinwerfer-Retrofit',
  'schuko-auf-typ-2-adapter': 'Schuko-auf-Typ-2-Adapter',
  'schuko-ladekabel-fur-wildfire': 'Schuko-Ladekabel für Wildfire',
  seat: 'Sitz',
  'side-bag': 'Seitentasche',
  'side-cover': 'Seitenabdeckung',
  'side-stand': 'Seitenständer',
  'side-stand-spring-set': 'Seitenständer-Feder-Set',
  'sitz-b-ware-gebraucht': 'Sitz (B-Ware / gebraucht)',
  stand: 'Montageständer',
  'stander-copy': 'Ständer',
  'starter-relais-12-v': '12-V-Starterrelais',
  'sticker-set': 'Sticker-Set',
  'surf-rack': 'Surf-Rack',
  'tall-rider-bundle': 'Tall-Rider-Bundle',
  'tank-b-ware': 'Tank (B-Ware)',
  'tft-touch-display-retrofit': 'TFT-Touchdisplay-Retrofit',
  'typ-2-kabel': 'Typ-2-Kabel',
  'usb-charging-port': 'USB-Ladeport',
  'usd-gabelset': 'USD-Gabel-Set',
  wildfire: 'Wildfire',
  'wildfire-abs': 'Wildfire ABS',
  'wildfire-gabelbruckenset': 'Wildfire-Gabelbrücken-Set',
  'wildfire-konfiguration': 'Wildfire-Konfiguration',
  'wildfire-performance': 'Wildfire Performance',
  windschild: 'Windschild',
  'xlr-charging-port': 'XLR-Ladeport',
};

const partWordOverrides: Record<string, string> = {
  alu: 'Alu',
  belage: 'Beläge',
  blinker: 'Blinker',
  bremsen: 'Bremsen',
  bremsleitung: 'Bremsleitung',
  bremslichtkabel: 'Bremslichtkabel',
  bremszylinder: 'Bremszylinder',
  dcdc: 'DC/DC',
  federbeine: 'Federbeine',
  fender: 'Kotflügel',
  fussrasten: 'Fußrasten',
  gabelbrucke: 'Gabelbrücke',
  gabelset: 'Gabel-Set',
  geladen: 'Laden',
  ladegerat: 'Ladegerät',
  led: 'LED',
  lenker: 'Lenker',
  mutterabdeckung: 'Mutterabdeckung',
  nachrustkit: 'Nachrüstkit',
  radabdeckung: 'Radabdeckung',
  reflektoren: 'Reflektoren',
  reifen: 'Reifen',
  seitenstander: 'Seitenständer',
  scheinwerfer: 'Scheinwerfer',
  speiche: 'Speiche',
  stossdampfer: 'Stoßdämpfer',
  tankgummi: 'Tankgummi',
  tft: 'TFT',
  typ: 'Typ',
  wildfire: 'Wildfire',
  xlr: 'XLR',
};

const historicalPartDetails: Record<string, { model: string; price?: number; variants?: string[] }> = {
  bremszylinder: { model: 'Bonfire', price: 59, variants: ['Rear Brake', 'Front Brake (220 mm)', 'CBS Front Brake (265 mm)'] },
  'copy-of-beifahrerfussrasten': { model: 'Bonfire', price: 15, variants: ['Paar', 'Links', 'Rechts'] },
  tank: { model: 'Bonfire', price: 99, variants: ['Black Matt', 'Silver', 'Orange', 'Grau', 'Olive', 'Blau', 'Halter mit/ohne'] },
  'passenger-hold': { model: 'Bonfire', price: 29, variants: ['B-Ware', 'historischer Vergleichspreis 69 €'] },
};

const historicalPartCategories: Array<[PartCategory, string[]]> = [
  ['Bremsen', ['brems', 'bremsscheibe']],
  ['Antrieb & Controller', ['motor', 'hub-motor', 'wildfire-performance']],
  ['Fahrwerk & Räder', ['achse', 'bearing', 'feder', 'gabel', 'rad', 'reifen', 'speiche', 'felge', 'lenker', 'foot-peg', 'fussrasten', 'stand']],
  ['Elektrik & Laden', ['akku', 'battery', 'charger', 'charging', 'lade', 'dcdc', 'display', 'dongle', 'keyless', 'nfc', 'blink', 'light', 'scheinwerfer', 'kill', 'relais', 'kabel', 'usb', 'typ-2', 'schuko', 'xlr', 'button', 'schaltereinheit']],
  ['Bundles', ['bundle', 'configuration']],
  ['Karosserie & Halter', ['tank', 'sitz', 'seat', 'cover', 'rack', 'halter', 'schutz', 'topcase', 'windschild', 'fender', 'reflektor', 'sticker', 'bag', 'surf']],
];

const humanizePartSlug = (slug: string) => {
  if (partTitleOverrides[slug]) return partTitleOverrides[slug];
  const cleanedSlug = slug.replace(/^copy-of-/, '');
  return cleanedSlug.split('-').map((word) => partWordOverrides[word] ?? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(' ');
};

const inferPartCategory = (slug: string): PartCategory => {
  const match = historicalPartCategories.find(([, keywords]) => keywords.some((keyword) => slug.includes(keyword)));
  return match?.[0] ?? 'Zubehör';
};

const partResearchEntries = ((partsCatalog as unknown as { entries?: PartResearchEntry[] }).entries ?? []);
const archivedPartDetails = ((partDetailsCatalog as unknown as { entries?: ArchivedPartDetail[] }).entries ?? []);
const researchEntryBySlug: Record<string, PartResearchEntry | undefined> = {
  bremsbelage: partResearchEntries.find((entry) => entry.id === 'bonfire-mcb833-amazon-candidate'),
  bremszylinder: partResearchEntries.find((entry) => entry.id === 'btm-bremszylinder'),
  'copy-of-beifahrerfussrasten': partResearchEntries.find((entry) => entry.id === 'btm-beifahrerfussrasten'),
  tank: partResearchEntries.find((entry) => entry.id === 'btm-tank'),
  'passenger-hold': partResearchEntries.find((entry) => entry.id === 'btm-passenger-hold-b-grade'),
  'dcdc-converter': partResearchEntries.find((entry) => entry.id === 'wildfire-dcdc-ips-dtd110s1210'),
  'reparatur-qs8s-stecker': partResearchEntries.find((entry) => entry.id === 'wildfire-qs8-antispark-amazon-candidates'),
  'dual-sport-reifen-upgrade': partResearchEntries.find((entry) => entry.id === 'bonfire-heidenau-manual-matches'),
  ladegerat: partResearchEntries.find((entry) => entry.id === 'bonfire-tangspower-588v-10a-xlr-candidate'),
  'usb-charging-port': partResearchEntries.find((entry) => entry.id === 'wildfire-usb-charging-port-amazon-candidate'),
};

const partTechnicalEvidence: Record<string, { text: string; href: string; label: string; eyebrow?: string }> = {
  'side-stand': {
    text: 'Das lokale Bonfire-Handbuch bestätigt die Funktion des Seitenständers und seines Sicherheitsschalters, nennt aber keine Teilenummer, Maße oder normierte Austauschgröße. Deshalb wird kein Fahrrad- oder Universalständer als passend ausgegeben.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  'seitenstander-kill-switch': {
    text: 'Das lokale Bonfire-Handbuch beschreibt den Seitenständer-Schalter als sicherheitsrelevante Motorabschaltung. Eine konkrete Schalter- oder Steckerteilenummer ist dort nicht angegeben.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  bremsbelage: {
    text: 'Das lokale Bonfire-Handbuch nennt Bremsbeläge als Wartungsteil und unterscheidet die Fahrzeug-/Bremsscheibenvarianten. MCB833 wird zusätzlich als Community-Spur genannt; Belagform, Dicke, Halterung und Fahrzeugvariante müssen am Fahrzeug bestätigt werden.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  bearings: {
    text: 'Der lokale Bonfire-Eintrag bezeichnet das Teil nur als Lenkkopflager. Im Handbuch und im Archiv fehlen Lagermaße, Norm, Teilenummer und Dichtungsangaben. Deshalb wird kein allgemeines Amazon-Lager als passend ausgegeben.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  bremsscheibe: {
    text: 'Das lokale Handbuch nennt je nach Fahrzeugstand unterschiedliche Scheibengrößen. Ohne Lochkreis, Offset, Stärke und Befestigung darf daraus kein beliebiger Marktplatzartikel abgeleitet werden.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  'dual-sport-reifen-upgrade': {
    text: 'Das lokale Handbuch nennt Heidenau K60/K36 und die Größen 90/90-18 vorn sowie 110/80-18 hinten. Dazu sind unten technische Amazon-Treffer mit genau diesen Modell-/Größenangaben hinterlegt. Die konkrete Reifenfreigabe muss trotzdem zur Fahrzeugvariante und Zulassung passen.',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    label: 'Bonfire-Handbuch öffnen',
  },
  ladegerat: {
    text: 'Die lokal gesicherte Bonfire-Produktbeschreibung nennt 58,8 V und Varianten mit 5 A, 10 A und 20 A; ein XLR-Ladeanschluss ist für bestimmte Konfigurationen archiviert. Der unten verlinkte Amazon-Treffer deckt 58,8 V/10 A, 14S-Lithium und 3-poliges XLR ab. Pinbelegung, Ladekennlinie und BTM-Freigabe bleiben zu prüfen.',
    href: '/quellen#ersatzteil-archiv',
    label: 'Lokales Ersatzteil-Archiv öffnen',
    eyebrow: 'Abgleich mit lokalem Archiv',
  },
  'speiche-mit-nippel': {
    text: 'Die lokale Community-PDF weist darauf hin, dass Speichen nach Länge, Biegung und Durchmesser bestellt werden müssen. Ein allgemeiner Speichenlink wäre deshalb keine bestätigte Passform.',
    href: '/pdfs/12-wildfire-handbuch-1-4-community.pdf',
    label: 'Community-PDF öffnen',
  },
  'dcdc-converter': {
    text: 'Die lokale Datenblatt-Sammlung identifiziert den historischen IPS-DTD110S1210. Ein Mean-Well-Ersatz ist ausdrücklich keine Drop-in-Lösung; ein bestätigter Austausch ist nicht hinterlegt.',
    href: '/pdfs/17-ips-dtd110s1210-datasheet.pdf',
    label: 'IPS-Datenblatt öffnen',
  },
};

const partSafetyByCategory: Record<PartCategory, string> = {
  Bremsen: 'sicherheitskritisch',
  'Fahrwerk & Räder': 'sicherheitskritisch',
  'Elektrik & Laden': 'elektrisch prüfen',
  'Antrieb & Controller': 'sicherheitskritisch',
  'Karosserie & Halter': 'Kompatibilität prüfen',
  Bundles: 'Konfiguration prüfen',
  Zubehör: 'Kompatibilität prüfen',
};

const partSummaryOverrides: Record<string, string> = {
  'alu-topcase': 'Aluminium-Topcase mit rund 40 Litern Stauraum. Vor dem Kauf die Trägerplatte, Befestigung und Verriegelung am eigenen Fahrzeug vergleichen.',
  'bar-end-mirrors': 'Lenkerendenspiegel für die Bonfire. Archiviert sind die Varianten Normal und Upgrade; vor dem Kauf Lenkeraufnahme, Abmessungen, Gewinde und E-Prüfzeichen vergleichen.',
  bearings: 'Lenkkopflager für die Steuerrohr-/Lenkkopflagerung. Innen- und Außendurchmesser, Bauhöhe, Dichtung und Lagernorm sind lokal nicht belegt und müssen am Fahrzeug vermessen werden.',
  'bluetooth-dongle': 'Bluetooth-Dongle für die Kommunikation mit bestimmten Wildfire- und Bonfire-Controllern. Modellstand, Steckverbindung und unterstützte Controller-Version vor dem Kauf prüfen.',
  bremsen: 'Sammel- und Konfigurationseintrag für die Bremsanlage. Bremssattel, Scheibe, Belagform, Leitungen und Fahrzeugvariante müssen getrennt geprüft werden.',
  bremslichtkabel: 'Kabel- und Schaltereinheit für die Bremslichtansteuerung. Kabellänge, Stecker und Schaltlogik müssen zur Fahrzeugvariante passen.',
  'bremszylinder-und-hebel': 'Bremszylinder und Hebel als kombinierte oder getrennte Variante. Seite, Kolbendurchmesser, Anschluss und Hebelgeometrie vor dem Kauf vergleichen.',
  'change-the-color-of-my-off-road-protection': 'Farbvariante für den Offroad-Schutz der Wildfire. Dieses Angebot beschreibt eine Konfiguration, kein universelles Schutzteil.',
  'charger-upgrade': '10-A-Ladegerät als archivierte Upgrade-Option. Ausgangsspannung, Stecker, Ladekennlinie und Akku-Freigabe vor dem Ersatz prüfen.',
  'charging-bundle': 'Lade- und USB-Bundle mit XLR-Ladeanschluss und USB-Port. Modellvariante, Adapter, Kabelweg, Sicherung und Zulassung vor dem Einbau prüfen.',
  'classic-indicator': 'Satz aus vier klassischen Halogenblinkern. Stecker, Relais, Befestigung und E-Prüfzeichen müssen mit dem vorhandenen Fahrzeug übereinstimmen.',
  'classic-mirrors': 'Satz aus zwei klassischen Spiegeln. Gewinde, Adapter, Sichtfeld und E-Prüfzeichen vor dem Kauf mit dem vorhandenen Fahrzeug abgleichen.',
  'copy-of-52-v-batterie': '52-V-Akkuvarianten mit 1,8 kWh oder 3,1 kWh. Zellaufbau, BMS, Gehäuse, Steckverbindungen, Ladegerät und Fahrzeugrevision müssen exakt zusammenpassen.',
  'copy-of-achse': 'Beifahrerfußrasten in den archivierten Varianten Paar, links oder rechts. Aufnahme, Gewinde, Klappmechanik und Fahrzeugseite vor dem Kauf vergleichen.',
  'copy-of-beifahrerfussrasten': 'Schwinge mit oder ohne Beifahrerfußrasten. Achsaufnahme, Breite, Lagerung und Rahmenvariante müssen vor dem Ersatz abgeglichen werden.',
  'copy-of-federbeine': 'Achsen für Vorderrad und Schwinge. Durchmesser, Länge, Gewinde, Distanzhülsen und Fahrzeugvariante vor dem Kauf messen.',
  'copy-of-gabelbruckenset': 'Motorhalterungs-Set mit archivierten M16-Muttern, Kontermuttern und Distanzhülsen. Gewinde, Abstände und Rahmenaufnahme vor dem Ersatz prüfen.',
  'copy-of-motorhalterung-set': 'Mutterabdeckungen für M16-, M12-, M10- und M8-Gewinde. Gewinde, Bundmaß und benötigte Stückzahl vor dem Kauf prüfen.',
  'copy-of-off-road-schutz': 'Dual-Sport-Lenker mit Mittelstrebe und 28-mm-Konifizierung im angegebenen Bereich. Klemmmaß, Biegung und Bedienelemente müssen zur Wildfire passen.',
  'dcdc-converter': 'DC/DC-Wandler für die Fahrzeug-Elektrik. Eingang, Ausgang, Strom, Pinout, Stecker und Einbauraum müssen vor einem Ersatz abgeglichen werden.',
  'dual-sport-reifen-upgrade': 'Heidenau K60/K36 in den lokal dokumentierten Größen 90/90-18 vorn, 3.50-18 vorn/offroad und 110/80-18 hinten. Traglast, Index, Felge und Zulassung prüfen.',
  display: 'Tachometer-/Anzeigeeinheit für die Bonfire. Anzeigeversion, Protokoll, Stecker und Halterung müssen vor dem Ersatz verglichen werden.',
  'enduro-fender': 'Enduro-Kotflügel für Bonfire oder Wildfire. Länge, Befestigung, Reifenfreiheit und Fahrzeugvariante vor dem Kauf prüfen.',
  felge: '18-Zoll-Felge für Vorder- oder Hinterrad. Nabe, Achse, Felgenbreite, Speichenbohrung und Felgenbett müssen zur konkreten Radvariante passen.',
  'foot-pegs-set': 'Fußrasten-Set für die Bonfire. Aufnahme, Gewinde, Position, Klappmechanik und Fahrzeugseite vor dem Kauf vergleichen.',
  'gabelbrucke-mit-lenkerklemmen': 'Gabelbrückenset mit möglichen Varianten für komplette, obere oder untere Brücke sowie Lenkerklemmen und Muttern. Gabelmaß, Lager und Klemmung müssen passen.',
  gabelset: 'Gabelset für die Vorderradführung. Standrohrmaß, Achsaufnahme, Bremssattelhalterung, Lager und Fahrzeugvariante vor dem Ersatz prüfen.',
  'gasdruck-federbeine': 'Verstellbare Gasdruck-Federbeine mit archivierter Länge von 330 bis 360 mm. Auge, Buchsenbreite, Bolzendurchmesser und Belastbarkeit vor dem Kauf messen.',
  'goldene-usd-gabel': 'USD-Gabel in goldener Ausführung für die Wildfire. Standrohrmaß, Achsaufnahme, Bremse, Gabelbrücke und Fahrzeugrevision vergleichen.',
  handguards: 'Aluminium-Handprotektoren für Schutz vor Fahrtwind und leichten Stößen. Lenkeraufnahme, Freigängigkeit und Bedienelemente vor dem Kauf prüfen.',
  'handlebar-crash-bars': 'Lenker-Sturzbügel in Schwarz oder Silber. Archiviert als nicht kompatibel mit Lenkerendenspiegeln; Lenkeraufnahme und Befestigung vor dem Kauf prüfen.',
  headlight: 'Scheinwerfer für die Bonfire. Gehäuse, Halterung, Spannung, Stecker und Leuchtmittel müssen zur Fahrzeugvariante passen.',
  'headlight-grill': 'Schutzgitter für den Scheinwerfer. Außenmaß, Befestigung und Abstand zum Scheinwerfer vor dem Kauf abgleichen.',
  'hintere-stossdampfer': 'Hintere Federbeine für die Bonfire. Länge, Auge, Buchsenbreite, Bolzendurchmesser und Belastbarkeit vor dem Ersatz messen.',
  'hinterer-radschutz': 'Hinterer Radschutz in einer archivierten neueren Ausführung. Länge, Halterung, Reifenfreiheit und Fahrzeugrevision vor dem Kauf prüfen.',
  'hub-motor': 'Radnabenmotor mit schwarzer 2.15-18-Felge, 36 Speichen und Nippeln, eingespeicht und zentriert. Nabe, Achse, Leistung, Kabel und Controller müssen zur Variante passen.',
  'key-set': 'Schloss-Set mit Lenkradschloss, Zündschloss, Tankkappe und zwei Schlüsseln. Schlosskörper, Stecker und Befestigung vor dem Kauf vergleichen.',
  'keyless-go': 'Keyless-Go-System mit zwei Fernbedienungen für die Bonfire. Steuergerät, Kabelsatz, Frequenz und Fahrzeugvariante müssen übereinstimmen.',
  'keyless-go-retro-fit': 'Keyless-Go-Nachrüstset für die Bonfire S mit Steuergerät, Zusatzkabel, zwei 5-A-Sicherungen und zwei Fernbedienungen. Fahrzeug- und Zündschlossvariante prüfen.',
  ladegerat: 'Bonfire-Ladegerät mit 58,8 V und archivierten Varianten mit 5 A, 10 A und 20 A. Die historischen Gehäusemaße unterscheiden sich je Variante; Stecker, Ladekennlinie und Akku-Freigabe prüfen.',
  'langer-alu-radschutz': 'Längerer Radschutz aus geschliffenem Aluminium für die Wildfire. Länge, Halterung, Reifenfreiheit und Fahrzeugvariante vor dem Kauf prüfen.',
  'langer-bonfire-sitz': 'Längerer und stärker gepolsterter Bonfire-Sitz. Sitzlänge, Höhe, Befestigungspunkte und Abstand zu den Fußrasten vor dem Kauf vergleichen.',
  lenker: 'Schwarzer Aluminiumlenker, archiviert mit 800 mm Breite, 120 mm Höhe und 5-mm-Bohrung für die linke Schaltereinheit. Klemmmaß, Biegung und Leitungsführung vergleichen.',
  'led-blinker': 'LED-Blinker für Elektro-Enduros beziehungsweise Roller der 50- und 125-ccm-Klasse. Spannung, Relais, Stecker, Befestigung und E-Prüfzeichen prüfen.',
  'led-indicators': 'Satz aus vier LED-Blinkern für die Bonfire, archiviert mit Normal- und Upgrade-Varianten. Stecker, Relais, Befestigung und E-Prüfzeichen vergleichen.',
  'light-holder': 'Scheinwerferhalter für die Bonfire. Rohrmaß, Lochabstand, Gehäuse und Befestigung vor dem Kauf prüfen.',
  luftgekuhlt: 'Kühlkit mit Kühlrippen, Ferrofluid und Wärmeleitpaste. Motorbauform, Einbaufläche und Anwendungshinweise vor dem Einbau prüfen.',
  'moped-license-plate-holder': 'Kennzeichenhalter für das archivierte Maß 255 × 130 mm bei Bonfire E und X; bei der S gelten andere Zulassungsbedingungen. Halterung und Kennzeichenformat vor dem Kauf prüfen.',
  'modern-bundle': 'Modern-Bundle aus LED-Blinkern, Lenkerendenspiegeln und Griffen. Kompatibilität der Einzelteile und gewünschte Farbe vor dem Kauf vergleichen.',
  'mutterabdeckung-set': 'Mutterabdeckungs-Set für die Bonfire. Gewindegrößen, Bundmaß und benötigte Abdeckungen vor dem Kauf vergleichen.',
  'nfc-karte-nachrustkit': 'NFC-Karte beziehungsweise Nachrüstkit für bestimmte Bonfire- und Wildfire-Varianten. Lesegerät, Systemversion und Fahrzeugkonfiguration müssen passen.',
  'off-road-bundle': 'Offroad-Bundle aus Gitter und Offroad-Schutz. Fahrzeugvariante, Befestigung und Freigängigkeit beider Komponenten vor dem Kauf prüfen.',
  'off-road-schutz': 'Offroad-Schutz für die Karosserie. Fahrzeugvariante, Material, Befestigung und Freigängigkeit zu Lenker und Beleuchtung vor dem Kauf prüfen.',
  'passenger-hold': 'Soziushalter für die Bonfire. Rahmenaufnahme, Befestigung und Variante müssen zum konkreten Fahrzeug passen.',
  'performance-bundle': 'Performance-Bundle aus Gabelstabilisator und Retro-Windschild. Gabelmaß, Befestigung und Freigängigkeit vor dem Kauf prüfen.',
  'radabdeckung': 'Radabdeckung für die Bonfire. Position, Länge, Befestigung und Reifenfreiheit müssen zur konkreten Rad- und Rahmenvariante passen.',
  'rear-light': 'Rücklicht für die Bonfire. Spannung, Stecker, Befestigung und Zulassung vor dem Ersatz vergleichen.',
  'rear-rack': 'Gepäckträger für den hinteren Fahrzeugbereich. Rahmenaufnahme, Traglast, Lochabstände und Freigängigkeit vor dem Kauf prüfen.',
  reflektoren: 'Roter Reflektor für hinten und orangener Reflektor für die Seite, jeweils archiviert als Einzelstück. Position, Maß und Zulassung vergleichen.',
  'range-extender-bundle': 'Reichweiten-Bundle aus Batterie und Ladegerät, archiviert mit 5-A- und 10-A-Varianten. Akkuspannung, BMS, Stecker und Ladekennlinie müssen zusammenpassen.',
  'retro-windschild': 'Retro-Windschild für die Bonfire. Halterung, Abmessungen, Sichtfeld und Freigängigkeit vor dem Kauf prüfen.',
  'ride-mode-button': 'Taster für die Fahrmodi der Bonfire. Schaltertyp, Stecker, Einbauposition und Softwareunterstützung vor dem Ersatz prüfen.',
  'schuko-auf-typ-2-adapter': 'Adapter für das Laden an einer Typ-2-Ladesäule. Steckerbelegung, Stromstärke, Ladegerät und Sicherheitsfunktionen vor der Verwendung prüfen.',
  'schuko-ladekabel-fur-wildfire': 'Schuko-Ladekabel für die Wildfire. Netzseite, Gerätestecker, Stromstärke und Fahrzeug-/Ladegerätvariante vor dem Kauf vergleichen.',
  schaltereinheit: 'Lenker-Schaltereinheit für die Bonfire. Seite, Tasterbelegung, Stecker, Spannung und Leitungsführung müssen passen.',
  'scheinwerfer-retrofit': 'Scheinwerfer-Nachrüstkit für bestimmte Bonfire- und Wildfire-Varianten. Spannung, Stecker, Halterung und Zulassung vor dem Einbau prüfen.',
  'side-cover': 'Seitenabdeckung für die Bonfire, archiviert als linke und rechte Variante. Form, Befestigung und Fahrzeugrevision vergleichen.',
  seat: 'Sitz mit archivierter Länge von 50 cm und veganem Leder. Befestigungspunkte, Sitzhöhe und Fahrzeugvariante vor dem Kauf vergleichen.',
  'side-bag': 'Seitentasche mit archivierten Außenmaßen von etwa 37 × 28 × 12 cm und fahrzeugspezifischer Halterung. Montage, Freigängigkeit und Verriegelung am Fahrzeug prüfen.',
  'side-stand': 'Seitenständer für die Bonfire. Ständerfuß, Gelenk, Feder und Sicherheitsschalter müssen zur konkreten Rahmen- und Kabelvariante passen.',
  'side-stand-spring-set': 'Doppelfeder-Set für den Seitenständer der Bonfire. Federlänge, Hakenform und Montageposition vor dem Kauf vergleichen.',
  'sitz-b-ware-gebraucht': 'Sitz als B-Ware beziehungsweise Gebrauchtteil, archiviert mit 50 cm Länge und veganem Leder. Zustand, Befestigung und Fahrzeugvariante prüfen.',
  'speiche-mit-nippel': 'Speiche mit Nippel für Vorder- oder Hinterrad. Länge, Kröpfung, Durchmesser, Gewinde, Nippeltyp und Radseite vor der Bestellung messen.',
  'stander-copy': 'Spezielle Bundschraube mit passender Mutter für den Ständer. Gewinde, Länge, Bundmaß und Festigkeit vor dem Einbau vergleichen.',
  'sticker-set': 'Sticker-Set mit archiviertem Inhalt aus Ride-Tastefully-, Blacktea-, Hell- und B/T-Aufklebern. Oberfläche, Maße und gewünschte Position prüfen.',
  'surf-rack': 'Surf-Rack für die Bonfire. Rahmenaufnahme, Traglast, Abmessungen und Freigängigkeit vor dem Kauf prüfen.',
  'tall-rider-bundle': 'Bundle aus Lenkererhöhung und unteren Fußrastenadaptern für größere Fahrer ab etwa 185 cm. Einbauhöhe, Leitungsreserve und Fußrastenposition prüfen.',
  tank: 'Bonfire-Tank in mehreren Farbvarianten; je nach Variante mit oder ohne Tankdeckel. Befestigung, Tankdeckel und Fahrzeugrevision vor dem Kauf abgleichen.',
  'tank-b-ware': 'Bonfire-Tank als B-Ware; archiviert mit leichten Kratzern, aber ohne Dellen sowie mit Varianten mit oder ohne Tankdeckel. Befestigung und Fahrzeugrevision prüfen.',
  'tft-touch-display-retrofit': 'TFT-Touch-Display als Nachrüstkomponente für bestimmte Bonfire- und Wildfire-Varianten. Stecker, Protokoll, Halterung und Softwarestand müssen passen.',
  'typ-2-kabel': 'Typ-2-Ladekabel mit archivierter Länge von 3 m. Steckerstandard, Stromstärke, Ladegerät und Fahrzeugseite vor dem Kauf prüfen.',
  'usb-charging-port': 'USB-Ladeanschluss mit wasserdichter Kappe und Ein-/Aus-Schalter. Spannung, Sicherung, Kabelweg und Befestigung müssen zur Bonfire passen.',
  'usd-gabelset': 'USD-Gabel-Set für bestimmte Wildfire-Varianten. Standrohrmaß, Achsaufnahme, Bremse, Gabelbrücke und Zulassung vor dem Kauf prüfen.',
  wildfire: 'Dual-Sport-Lenker mit Mittelstrebe und 28-mm-Konifizierung im angegebenen Bereich. Klemmmaß, Biegung und Bedienelemente müssen zur Wildfire passen.',
  'wildfire-abs': 'Konfigurationsvariante für eine Wildfire mit ABS-Bezug. Bremsanlage, Sensorik, Halterung und Fahrzeugrevision vor dem Ersatz prüfen.',
  'wildfire-gabelbruckenset': 'Gabelbrückenset für die Wildfire. Gabelmaß, Lager, Klemmung, Lenkeraufnahme und Fahrzeugrevision vor dem Kauf vergleichen.',
  'wildfire-konfiguration': 'Historische Wildfire-Konfiguration mit Auswahl von Ladeanschluss, Ladeleistung, Batterie- und Performance-Variante. Nicht als einzelnes Ersatzteil verstehen.',
  'wildfire-performance': 'Historische Wildfire-Performance-Konfiguration mit ABS-Bezug und Antriebskomponenten. Nicht als freigegebenes Austauschset verwenden; Modellstand und Zulassung prüfen.',
  windschild: 'Windschild für die Bonfire. Abmessungen, Halterung, Sichtfeld und Freigängigkeit vor dem Kauf prüfen.',
  'xlr-charging-port': 'XLR-Ladeanschluss für bestimmte Bonfire-Konfigurationen. Modell, Adapter, Pinbelegung, Kabelweg und Zulassung vor dem Einbau fachkundig prüfen.',
};

const historicalShopParts: HistoricalShopPart[] = partsCatalog.historical_product_slugs.map((slug) => {
  const details = historicalPartDetails[slug];
  const research = researchEntryBySlug[slug];
  const archived = archivedPartDetails.find((entry) => entry.slug === slug && entry.ok);
  const model = details?.model ?? (slug.includes('wildfire') || archived?.title?.toLowerCase().includes('wildfire') ? 'Wildfire' : 'Bonfire-Familie, Variante prüfen');
  const category = inferPartCategory(slug);
  const title = partTitleOverrides[slug] ?? archived?.title ?? humanizePartSlug(slug);
  const archivedVariants = archived?.variants?.map((variant) => variant.title ?? variant.name ?? '').filter(Boolean) as string[] | undefined;
  const archivedVariantDetails = archived?.variants?.map((variant) => ({ label: variant.title ?? variant.name ?? '', price: variant.price_eur, available: variant.available })).filter((variant) => variant.label);
  const confirmedPurchase = research?.purchase_status === 'confirmed' && Boolean(research.amazon_url || research.fallbacks?.length || research.supplier_link);
  const candidatePurchase = research?.purchase_status === 'candidate' && Boolean(research.amazon_url);
  const confirmedFallback = confirmedPurchase ? research?.fallbacks?.[0] ?? (research?.supplier_link ? { name: 'Hersteller-/Fachquelle', url: research.supplier_link } : undefined) : undefined;
  const purchaseOptions = research?.purchase_status === 'manual-match'
    ? research.purchase_options?.map((option) => ({ label: option.name, href: option.url, fitStatus: option.fit_status }))
    : confirmedPurchase || candidatePurchase
      ? [
        ...(research?.amazon_url ? [{ label: candidatePurchase ? 'Amazon-Treffer öffnen' : 'Bestätigten Amazon-Artikel öffnen', href: research.amazon_url, fitStatus: research.purchase_note }] : []),
        ...(confirmedFallback ? [{ label: confirmedFallback.name, href: confirmedFallback.url, fitStatus: confirmedFallback.fit_status }] : []),
      ]
      : undefined;
  const hasPurchaseOptions = Boolean(purchaseOptions?.length);
  const technicalEvidence = partTechnicalEvidence[slug];
  return {
    id: slug,
    path: `/ersatzteile/${slug}`,
    title,
    category,
    model,
    price: archived?.price_min_eur ?? research?.historical_price_eur ?? details?.price,
    priceMax: archived?.price_max_eur,
    variants: archivedVariants?.length ? archivedVariants : research?.variants ?? details?.variants,
    variantDetails: archivedVariantDetails?.length ? archivedVariantDetails : undefined,
    archiveHref: localPartArchiveHref,
    historicalSummary: partSummaryOverrides[slug] ?? research?.specification_lead ?? `Historischer Ersatzteil-Eintrag für ${model}. Die archivierten Varianten und der alte Preis dienen nur als Orientierung; konkrete Maße, Befestigung, Stecker und Modellstand müssen vor dem Kauf geprüft werden.`,
    compatibilityNote: research?.compatibility_note ?? 'Die archivierten Angaben ersetzen keine Passformprüfung. Vor einer Bestellung Modellvariante, Maße, Befestigung, Stecker und Zulassung am Fahrzeug abgleichen.',
    confidence: research?.confidence ?? 'historischer Produktname; aktuelle Verfügbarkeit ungeprüft',
    safetyClass: research?.safety_class ?? partSafetyByCategory[category],
    purchaseStatus: research?.purchase_status === 'manual-match' && hasPurchaseOptions ? 'manual-match' : candidatePurchase ? 'candidate' : confirmedPurchase ? 'confirmed' : 'not-confirmed',
    purchaseNote: research?.purchase_note ?? 'Wenn du einen passenden Artikel gefunden und erfolgreich eingebaut hast, schreib uns gern in die Kommentare. Wir prüfen den Hinweis und ergänzen ihn, wenn er sich als passend bestätigt.',
    purchaseHeading: research?.purchase_heading,
    purchaseOptions,
    technicalEvidence,
    amazonHref: confirmedPurchase || candidatePurchase ? research?.amazon_url : undefined,
    amazonLabel: (confirmedPurchase || candidatePurchase) && research?.amazon_url ? candidatePurchase ? 'Amazon-Treffer öffnen' : 'Bestätigten Amazon-Artikel öffnen' : undefined,
    fallbackHref: confirmedFallback?.url,
    fallbackLabel: confirmedFallback?.name,
    fallbackFitStatus: confirmedFallback?.fit_status,
    archiveTimestamp: archived?.timestamp,
    historicalAvailability: archived ? (archived.available ? 'im Snapshot verfügbar markiert' : 'im Snapshot nicht verfügbar markiert') : 'keine auslesbare Snapshot-Angabe',
  };
});

const communityKnowledge: CommunityKnowledge[] = [
  {
    title: 'Bonfire: Modellstände sauber trennen',
    model: 'Bonfire · S / E / X',
    intro: 'Die Community-Aufbereitung macht klar: S, E und X teilen viele Chassis-Teile, sind elektrisch aber nicht automatisch identisch.',
    points: ['Frühe Bonfire und Bonfire X unterscheiden sich unter anderem bei Spannung, Motor, Vorderradbremse und Bereifung.', 'Für die frühe X werden 265 mm vorne genannt; bei der normalen Bonfire 220 mm.', 'Controller, Akku und Stecker immer nach konkretem Modellstand beurteilen.'],
    sourceLabel: 'BTM Community · Bonfire',
    sourceHref: 'https://btm-community.org/bonfire/',
  },
  {
    title: 'Bonfire: Wartung und Retrofits',
    model: 'Bonfire · Wartung',
    intro: 'Aus vielen einzelnen How-tos wird eine brauchbare Arbeitslandkarte für typische Wartungs- und Umbaufragen.',
    points: ['Batterie laden, Hochstromstecker vollständig verbinden und Sitz, Tank sowie Seitenteile korrekt demontieren.', 'Gasgriff, Blinker, Spiegel, Fußrasten, Scheinwerfergitter und Keyless-System sind als eigene Arbeitsschritte dokumentiert.', 'Bremsen, Räder, Lenkkopflager, Federbeine und Korrosionsschutz bleiben sicherheits- bzw. versionsabhängig.'],
    sourceLabel: 'BTM Community · Wartungsarbeiten',
    sourceHref: 'https://btm-community.org/bonfire/wartungsarbeiten-bonfire/',
  },
  {
    title: 'Wildfire: Serienstand und Fehlerbilder',
    model: 'Wildfire · Serie 2025',
    intro: 'Die stärkste Ergänzung für unsere Reparaturhilfe ist die Trennung zwischen ausgeliefertem Fahrzeug, Konfiguration und typischer Kinderkrankheit.',
    points: ['Reifendruck, Drehmomente und Wartungshinweise stammen aus dem dokumentierten Serienfahrzeug.', '5-V-DC/DC-Wandler, falsche Controllerwerte, BMS-Neustart und Ladeabbrüche bei einer Batterie sind als Fehlerbilder beschrieben.', 'Controller- und BMS-Daten werden getrennt betrachtet; FarDriver-Werte sind keine universellen Standardwerte.'],
    sourceLabel: 'BTM Community · Wildfire',
    sourceHref: 'https://btm-community.org/wildfire/',
  },
  {
    title: 'Historie: Generationenwechsel verstehen',
    model: 'Bonfire & Wildfire · Historie',
    intro: 'Die Historie ist besonders wertvoll, weil sie Prototypen, Serienfahrzeuge und spätere Retrofits nicht in einen Topf wirft.',
    points: ['Bonfire Y und frühe Wildfire-Prototypen werden als Entwicklung, nicht als Serienreferenz geführt.', '2025 markiert bei der Wildfire die wichtige Grenze zum tatsächlich ausgelieferten Serienstand.', '2026 ändern sich unter anderem Akku, CAN-Kommunikation, Ladeintegration, Fahrwerk und Bremsvarianten.'],
    sourceLabel: 'BTM Community · Historie',
    sourceHref: 'https://btm-community.org/historie/',
  },
];

const resources: Resource[] = [
  {
    kind: 'Dokument',
    title: 'Bonfire-Handbuch',
    description: 'Bedienung, Sicherheit, Fahrzeugübersicht, Batterie, Display, Wartung und Fehlersuche in der lokal gesicherten Handbuchdatei.',
    label: 'PDF',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    tags: ['Bonfire', 'Handbuch', 'PDF', 'lokal'],
    external: false,
  },
  {
    kind: 'Dokument',
    title: 'Bonfire Owner’s Manual als PDF',
    description: 'Gesicherte 44-seitige lokale Kopie des Bonfire-Series-Handbuchs. Drittanbieter-Herkunft ist vermerkt; Rechte zur Weiterveröffentlichung müssen noch geklärt werden.',
    label: 'PDF',
    href: '/pdfs/15-bonfire-handbuch-lokal.pdf',
    tags: ['Bonfire', 'PDF', 'lokal'],
    external: false,
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: Schaltplan & Kabelbaum',
    description: 'Lokale PDFs für Willkommenshinweis, Schaltplan und Kabelbaum. Vor Nutzung auf Versionsstand und Modell prüfen.',
    label: 'PDF',
    href: '/pdfs/02-wildfire-kabelbaum.pdf',
    tags: ['Wildfire', 'Schaltplan', 'Elektrik'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: Software, BMS & Drehmomente',
    description: 'Lokale Software-PDF. Die darin enthaltenen Angaben können je nach Baujahr und Softwarestand abweichen.',
    label: 'PDF',
    href: '/pdfs/04-wildfire-software.pdf',
    tags: ['Wildfire', 'Software', 'BMS'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: Willkommenshinweis',
    description: 'Historische BTM-PDF lokal gesichert. Vor dem Einsatz prüfen, ob die Version zum Fahrzeug passt.',
    label: 'PDF',
    href: '/pdfs/01-wildfire-willkommenshinweis.pdf',
    tags: ['Wildfire', 'PDF', 'Archiv'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: Kabelbaum / System Harness',
    description: 'Historische System-Harness-PDF lokal gesichert. Elektrische Arbeiten gehören in qualifizierte Hände.',
    label: 'PDF',
    href: '/pdfs/03-wildfire-system-harness-12v.pdf',
    tags: ['Wildfire', 'PDF', 'Elektrik'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Bonfire X: deutsches Handbuch',
    description: 'Forum-Anhang aus der Community-Sammlung, lokal gesichert. Rechte zur erneuten Veröffentlichung sind nicht geklärt.',
    label: 'Community-Anhang',
    href: '/pdfs/07-manual-bonfire-x-de.pdf',
    tags: ['Bonfire X', 'PDF', 'Community'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Bonfire X: technische Daten',
    description: 'Externer Referenzdatensatz mit Leistungs-, Maß-, Batterie-, Fahrwerks- und Reifendaten. Herstellerangaben und Varianten können abweichen.',
    label: 'Referenzdaten',
    href: 'https://www.adac.de/rund-ums-fahrzeug/zweirad/motorrad-roller/motorradkatalog/marken/black-tea/black-tea-bonfire-x-11066/',
    tags: ['Bonfire X', 'Datenblatt'],
    external: true,
  },
  {
    kind: 'Dokument',
    title: 'Alle lokalen PDFs',
    description: 'Ein zentraler Index mit allen derzeit gesicherten Handbüchern, Schaltplänen, Community-Anhängen und Datenblättern.',
    label: 'Lokale Sammlung',
    href: '/pdfs/index.html',
    tags: ['PDF', 'Archiv', 'lokal'],
    external: false,
  },
  {
    kind: 'Dokument',
    title: 'Wildfire-Handbuch der Community',
    description: 'Lokale Kopie des 28-seitigen Wildfire-Handbuchs aus der BTM Community. Rechte zur erneuten Veröffentlichung bitte beachten.',
    label: 'PDF',
    href: '/pdfs/19-wildfire-handbuch-community.pdf',
    tags: ['Wildfire', 'Handbuch', 'Community'],
    external: false,
    sourceHref: 'https://btm-community.org/wildfire/dokumente-wildfire/',
    sourceLabel: 'BTM Community',
  },
  {
    kind: 'Dokument',
    title: 'Wildfire-Wartungszusammenfassung',
    description: 'Lokale 4-seitige Übersicht zum Laden und zur Wartung. Werte und Abläufe vor Nutzung am eigenen Fahrzeug gegenprüfen.',
    label: 'PDF',
    href: '/pdfs/20-wildfire-wartung-community.pdf',
    tags: ['Wildfire', 'Wartung', 'Community'],
    external: false,
    sourceHref: 'https://btm-community.org/wildfire/dokumente-wildfire/',
    sourceLabel: 'BTM Community',
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: Gabelabdichtung',
    description: 'Lokale Community-PDF zur Fehlerspur an der Gabel. Fahrwerk sicherheitskritisch; nicht als Freigabe zum Weiterfahren verstehen.',
    label: 'PDF',
    href: '/pdfs/21-gabelabdichtung-community.pdf',
    tags: ['Wildfire', 'Fahrwerk', 'Community'],
    external: false,
    sourceHref: 'https://btm-community.org/wildfire/dokumente-wildfire/',
    sourceLabel: 'BTM Community',
  },
  {
    kind: 'Dokument',
    title: 'Wildfire: FarDriver-Settings',
    description: 'Lokale 2-seitige Übersicht zu Controller-Einstellungen. Keine Standardkonfiguration übernehmen; Modell, Akkuanzahl und Softwarestand prüfen.',
    label: 'PDF',
    href: '/pdfs/22-wildfire-fardriver-settings-community.pdf',
    tags: ['Wildfire', 'FarDriver', 'Community'],
    external: false,
    sourceHref: 'https://btm-community.org/wildfire/dokumente-wildfire/',
    sourceLabel: 'BTM Community',
  },
  {
    kind: 'Ersatzteil',
    title: 'Ersatzteil-Katalog',
    description: 'Alle historischen Einträge aus dem früheren Hersteller-Shop auf einer eigenen Seite. Bestand, Preise und Abwicklung sind nicht mehr zugesichert.',
    label: '106 Shop-Einträge',
    href: '/ersatzteile',
    tags: ['Katalog', 'Original', 'Verfügbarkeit prüfen'],
    external: false,
  },
  {
    kind: 'Community',
    title: 'DC/DC-Wandler: IPS-DTD110S1210',
    description: 'Kurzfassung zur Wildfire-12-V-Versorgung. Teilenummer und Passform müssen am Fahrzeug geprüft werden.',
    label: 'Kurzfassung',
    href: '/hilfe/dcdc',
    tags: ['Wildfire', 'Elektrik', 'Sicherheitsrelevant'],
    guidePath: '/hilfe/dcdc',
  },
  {
    kind: 'Community',
    title: 'Akku / BMS: Reparaturspuren',
    description: 'Akku wird nicht erkannt? Erst sicher stilllegen, dann BMS, Zellspannung und Wasserschäden fachkundig prüfen lassen.',
    label: 'Kurzfassung',
    href: '/hilfe/akku-bms',
    tags: ['Bonfire', 'Wildfire', 'Akku'],
    guidePath: '/hilfe/akku-bms',
  },
  {
    kind: 'Community',
    title: 'BTM Community-Wissen',
    description: 'Redaktionell geordnete Modell-, Wartungs- und Technikhinweise mit Quellenangabe.',
    label: 'Aufbereitung',
    href: '/community',
    tags: ['Bonfire', 'Wildfire', 'Quelle'],
  },
  {
    kind: 'Community',
    title: 'BTM Community: Wissen übernommen',
    description: 'Redaktionell aufbereitete Modell-, Wartungs-, Wildfire- und Historienhinweise — kurz lesbar und jeweils mit Originalquelle.',
    label: 'Lokale Aufbereitung',
    href: '/community',
    tags: ['Bonfire', 'Wildfire', 'Quelle'],
  },
];

const repairGuides: RepairGuide[] = [
  {
    id: 'hilfe-dcdc',
    path: '/hilfe/dcdc',
    title: '12-V-Versorgung prüfen',
    model: 'Wildfire · DC/DC-Wandler',
    intro: 'Wenn Licht, Steuerung oder andere 12-V-Verbraucher ausfallen, nicht blind ein ähnliches Netzteil bestellen.',
    steps: [
      'Modell, Baujahr und Fehlerbild notieren; Wandler, Stecker, Sicherung und Einbauraum fotografieren.',
      'Durch eine Fachkraft Eingangsspannung, 12-V-Ausgang, Polung, Sicherung und Steckverbindungen prüfen lassen.',
      'IPS-DTD110S1210 wird als 110-V-DC-auf-12-V-DC-Wandler mit 10 A genannt. Datenblatt, Stecker, Befestigung und Absicherung müssen gemeinsam passen.'
    ],
    safety: 'Nicht unter Spannung umstecken. Arbeiten an der Hochvoltseite gehören in einen Fachbetrieb.',
    sourceLabel: 'ElektroRoller-Forum · „Ersatzteile BT Wildfire“ · Thema 48272',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48272',
    detailSections: [
      {
        title: '1. Fehlerbild sauber eingrenzen',
        paragraphs: ['Bei einem Ausfall von Licht, Steuerung oder anderen 12-V-Verbrauchern wird zuerst nur das Fehlerbild dokumentiert. Die wichtige Frage für die Werkstatt ist: Fällt nur die 12-V-Seite aus oder reagiert das gesamte Fahrzeug nicht mehr?'],
        bullets: [
          'Modell, Baujahr und Zeitpunkt des Ausfalls notieren.',
          'Ladegerät trennen und Fahrzeug ausgeschaltet lassen.',
          'Wandler, Sicherung, Stecker und Einbauraum fotografieren — nichts unter Spannung abziehen.'
        ]
      },
      {
        title: '2. Wandler technisch abgleichen',
        paragraphs: ['IPS-DTD110S1210 wird im Community-Thread als 110-V-DC-auf-12-V-DC-Wandler mit 10 A genannt. Das ist ein Recherchehinweis und keine offizielle BTM-Freigabe. Ein Ersatzteil ist erst dann plausibel, wenn elektrische und mechanische Daten gemeinsam übereinstimmen.'],
        bullets: [
          'Eingangsspannungsbereich und 12-V-Ausgang vergleichen.',
          'Stecker, Polung, Stromrating, Sicherung und Kabelquerschnitt abgleichen.',
          'Befestigung, Einbauraum und Schutz gegen Vibrationen berücksichtigen.',
          'Ein ähnliches Mean-Well-Gerät nicht als Plug-and-play-Ersatz behandeln.'
        ]
      },
      {
        title: '3. Reparatur dokumentieren und prüfen',
        paragraphs: ['Passt ein Wandler nach dem Datenabgleich, kann eine Fachkraft den Austausch durchführen. Danach werden 12-V-Ausgang, Sicherung und die angeschlossenen Verbraucher unter realistischer Last geprüft. Die verwendete Teilenummer und die Messwerte gehören anschließend zum Fahrzeugdatensatz.'],
        bullets: [
          'Altes und neues Typenschild fotografieren.',
          'Steckerbelegung und Sicherungswert schriftlich festhalten.',
          'Bei abweichenden Messwerten nicht weiterprobieren, sondern die Ursache eingrenzen lassen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-akku-bms',
    path: '/hilfe/akku-bms',
    title: 'Akku wird nicht erkannt',
    model: 'Bonfire & Wildfire · Akku / BMS',
    intro: 'Laden sofort stoppen und den Akku nicht auf Verdacht weiterverwenden.',
    steps: [
      'Fahrzeug ausschalten, Ladegerät trennen und auf Wärme, Geruch, Wasser- oder Gehäuseschäden achten.',
      'Akku-, Controller- und Fahrzeugdaten sowie auffällige Stecker oder Kabel fotografieren und notieren.',
      'BMS, Zellspannungen, Kommunikation und mögliche Wasserschäden fachkundig prüfen lassen. Erst danach über Reparatur oder Ersatz entscheiden.'
    ],
    safety: 'Akku nicht öffnen, überbrücken oder durch einen beliebigen Ersatzakku ersetzen. Es besteht Hochvolt- und Brandrisiko.',
    sourceLabel: 'ElektroRoller-Forum · „Reparatur Bonfire-Akku“ · Thema 48850',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48850',
    detailSections: [
      {
        title: '1. Laden und Nutzung stoppen',
        paragraphs: ['„Akku wird nicht erkannt“ ist nicht automatisch nur ein Bluetooth- oder Kontaktproblem. In den Community-Berichten werden auch BMS-Probleme, Wassereintritt und stark abweichende Zellspannungen als mögliche Ursachen diskutiert.'],
        bullets: [
          'Fahrzeug ausschalten, Ladegerät trennen und keinen weiteren Ladeversuch starten.',
          'Auf Wärme, Geruch, Feuchtigkeit, Verformung oder beschädigte Kabel achten.',
          'Bei auffälligem Akku Abstand halten und direkt einen qualifizierten Akku-Fachbetrieb kontaktieren.'
        ]
      },
      {
        title: '2. Befund für die Diagnose sammeln',
        paragraphs: ['Eine gute Dokumentation spart der Werkstatt Zeit und verhindert Teiletausch auf Verdacht. Der Akku bleibt dabei geschlossen; es werden nur äußere Informationen gesammelt.'],
        bullets: [
          'Modell, Baujahr, Akku- und Controllernummer sowie den genauen Fehlertext notieren.',
          'Gehäuse, Kabel, Steckkontakte und mögliche Wasserspuren fotografieren.',
          'Festhalten, ob der Fehler nach Regen, Standzeit, Tiefentladung oder einem Umbau auftrat.'
        ]
      },
      {
        title: '3. BMS und Zellseite fachkundig prüfen',
        paragraphs: ['Die Fachdiagnose trennt Akku-, BMS-, Ladegerät- und Fahrzeugseite. Dazu gehören je nach Befund Kommunikationsprüfung, Zellspannungen, Steckverbindungen und Hinweise auf Wasserschäden. Erst danach lässt sich entscheiden, ob eine Reparatur, ein BMS-Tausch oder ein Ersatzakku überhaupt vertretbar ist.'],
        bullets: [
          'Keinen beliebigen Ersatzakku anhand der Nennspannung auswählen.',
          'BMS niemals überbrücken und Zellen nicht selbst ausgleichen oder öffnen.',
          'Reparatur- und Prüfbericht mit Akkuvariante und Datum aufbewahren.'
        ]
      }
    ],
  },
];

repairGuides.push(
  {
    id: 'hilfe-fehleranalyse',
    path: '/hilfe/fehleranalyse',
    title: 'Fehlerbild systematisch eingrenzen',
    model: 'Bonfire & Wildfire · Diagnose',
    intro: 'Erst Fahrzeug und Symptom sauber einordnen, dann gezielt prüfen lassen — so vermeidest du Teiletausch auf Verdacht.',
    steps: [
      'Modell, Baujahr, Akkuzahl, Kilometerstand und den genauen Zeitpunkt des Fehlers notieren.',
      'Das Fahrzeug sicher abstellen und nur äußerlich prüfen: Wärme, Geruch, Feuchtigkeit, lose Stecker, Kabel und sichtbare Schäden dokumentieren.',
      'Das Symptom einem Bereich zuordnen: Start/12 V, Laden, Akku/BMS, Controller/Motor oder Fahrwerk. Erst danach die passende Reparaturhilfe öffnen.'
    ],
    safety: 'Keine Hochvolt-Messung, keine Steckerprüfung unter Spannung und kein Öffnen von Akku oder Controller in Eigenregie.',
    sourceLabel: 'ElektroRoller-Forum · „Fehleranalyse an der Bonfire/Wildfire“ · Thema 49336',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=49336',
    detailSections: [
      {
        title: '1. Fahrzeugstand festhalten',
        paragraphs: ['Bonfire, Bonfire X und Wildfire unterscheiden sich bei Akku, Controller, Display, Kabelbaum und Fahrwerk. Deshalb gehören Modell, Baujahr, Akkuzahl und Umbauten immer an den Anfang des Reparaturdatensatzes.'],
        bullets: [
          'Typenschild, Akku- und Controllerdaten fotografieren.',
          'Fehlertext, Pieptöne, Kontrollleuchten und Kilometerstand notieren.',
          'Nach Regen, Standzeit, Tiefentladung, Sturz oder Umbau aufgetretene Fehler markieren.'
        ]
      },
      {
        title: '2. Sichtprüfung ohne Eingriff',
        paragraphs: ['Die erste Prüfung bleibt äußerlich. Sie soll den Fehler für eine Fachkraft eingrenzen, nicht die Hochvoltseite ersetzen. Auffällige Wärme, Geruch, Wasser, beschädigte Isolierung oder lose Befestigungen sind Abbruchsignale.'],
        bullets: [
          'Ladegerät trennen und Fahrzeug ausgeschaltet lassen.',
          'Keine beschädigten Kabel bewegen oder provisorisch verbinden.',
          'Fotos mit Übersicht und Detailaufnahme zum Auftrag speichern.'
        ]
      },
      {
        title: '3. Werkstattauftrag vorbereiten',
        paragraphs: ['Eine kompakte Fehlerchronik ist hilfreicher als ein langer Forenverlauf. Sie trennt Beobachtung, Messung und Vermutung und verhindert, dass ein teures Teil ohne Diagnose getauscht wird.'],
        bullets: [
          'Fehlerbedingungen und reproduzierbare Geschwindigkeit, Last oder Temperatur angeben.',
          'Bisherige Änderungen und bereits getauschte Teile aufführen.',
          'Nach der Prüfung Messwerte, Teilenummer und Ergebnis zum Fahrzeugdatensatz ergänzen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-mosfet',
    path: '/hilfe/mosfet',
    title: 'MOSFET-Fehler: Wildfire bleibt stehen',
    model: 'Wildfire · FarDriver / Antrieb',
    intro: 'MOSFET-Fehler und fehlende Gasannahme gehören in eine sichere Antriebsdiagnose — nicht in einen weiteren Probefahrt-Test.',
    steps: [
      'Fehlercode, Pieptonanzahl, Displaymeldung und Situation des Ausfalls fotografieren oder notieren.',
      'Fahrzeug abstellen, Ladegerät trennen und nicht weiterfahren, wenn Leistung fehlt oder der Controller abschaltet.',
      'Controller, Phasenleitungen, Hall-Sensoren, Motor und BMS durch einen qualifizierten Betrieb voneinander abgrenzen lassen.'
    ],
    safety: 'MOSFET- und Phasenfehler betreffen die Hochvolt- und Antriebsseite. Akku und Controller nicht öffnen, überbrücken oder unter Spannung abstecken.',
    sourceLabel: 'ElektroRoller-Forum · „MOSFET Error – Wildfire steht“ · Thema 49333',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=49333',
    detailSections: [
      {
        title: '1. Fehlercode sichern',
        paragraphs: ['Im Community-Material werden für die Wildfire unter anderem Fehler 13 und 14 als High-Side- beziehungsweise Low-Side-MOSFET-Fehler beschrieben. Der Code zeigt die Fehlerklasse, beweist aber allein noch keinen vollständigen Controllerdefekt.'],
        bullets: [
          'Pieptöne zählen und zusammen mit dem Displaytext speichern.',
          'Notieren, ob vorher Leistungsverlust, Ruckeln, Vibrationen oder ein Schlag im Antrieb auftrat.',
          'Keine Parameteränderung als erste Gegenmaßnahme durchführen.'
        ]
      },
      {
        title: '2. Ursache vor Ersatzteil klären',
        paragraphs: ['Ein neuer Controller kann erneut ausfallen, wenn Phasenkabel, Steckkontakte, Motor, Hall-Sensoren oder BMS die Ursache sind. Die Prüfung muss deshalb den gesamten Antriebsstrang einschließen.'],
        bullets: [
          'Controllerdaten und Softwarestand auslesen lassen, ohne Werte auf Verdacht zu verändern.',
          'Phasen- und Versorgungskabel auf festen Sitz, Beschädigung und Überhitzung prüfen lassen.',
          'Motor mechanisch und elektrisch getrennt vom Controller bewerten lassen.'
        ]
      },
      {
        title: '3. Nach der Reparatur',
        paragraphs: ['Nach einem Austausch gehören Teilenummer, Firmware-/CAN-Stand und die verwendeten Einstellungen in den Fahrzeugdatensatz. Die erste Funktionsprüfung erfolgt kontrolliert und ohne öffentliche Fahrt.'],
        bullets: [
          'Fehler löschen und prüfen, ob er ohne Last erneut erscheint.',
          'Danach Anfahren, Bremsen und Temperaturentwicklung schrittweise kontrollieren.',
          'Bei erneutem Fehler sofort abbrechen und nicht weiterprobieren.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-controller',
    path: '/hilfe/controller',
    title: 'Controller-Ausfall richtig zuordnen',
    model: 'Bonfire Performance · FarDriver / CAN',
    intro: 'Abschalten bei Rekuperation oder Last kann vom Controller kommen — genauso aber von BMS, Verkabelung oder falschen Einstellungen.',
    steps: [
      'Fehler nur unter Last, beim Rekuperieren oder bei einer bestimmten Geschwindigkeit dokumentieren.',
      'Typenschild, Modellnummer, CAN-Ausführung und vorhandene FarDriver-Werte sichern.',
      'Ersatz erst nach Abgleich von Spannung, Strom, CAN, Steckern, Firmware und Motor beschaffen.'
    ],
    safety: 'Ein Controller ist kein Plug-and-play-Universalteil. Austausch, Parametrierung und Hochvoltprüfung gehören in qualifizierte Hände.',
    sourceLabel: 'ElektroRoller-Forum · „Controller-Problem BTM Bonfire Performance“ · Thema 48453',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48453',
    detailSections: [
      {
        title: '1. Abschaltbedingungen aufzeichnen',
        paragraphs: ['Im Forum werden bei der Bonfire Performance Abschaltungen unter Rekuperation und bei höherer Last beschrieben. Das ist ein verwertbares Fehlerbild, aber noch keine eindeutige Bauteildiagnose.'],
        bullets: [
          'Geschwindigkeit, Fahrmodus, Akkuzahl und Ladezustand festhalten.',
          'Displayfehler und Controller-Pieptöne mit Zeitstempel sichern.',
          'Keine weitere Belastungsfahrt durchführen, wenn das Bike unvermittelt ausgeht.'
        ]
      },
      {
        title: '2. Identität des Ersatzcontrollers prüfen',
        paragraphs: ['Für die Performance werden im Community-Thread FarDriver-Controller mit CAN-Kommunikation genannt. Die genaue Variante muss am vorhandenen Typenschild und am Fahrzeugstand geprüft werden; eine ähnliche Modellnummer reicht nicht.'],
        bullets: [
          'Nennspannung, Stromgrenzen, CAN, Stecker und Befestigung abgleichen.',
          'Motor, Display, BMS und Gasgriff als Gesamtsystem berücksichtigen.',
          'FarDriver-Einstellungen vor dem Ausbau sichern und nach dem Einbau dokumentiert übernehmen.'
        ]
      },
      {
        title: '3. Inbetriebnahme kontrollieren',
        paragraphs: ['Nach dem Einbau wird zuerst die Kommunikation geprüft. Erst wenn keine Warnung erscheint, darf eine kontrollierte Funktionsprüfung mit niedriger Last erfolgen.'],
        bullets: [
          'Stecker, Kabelverlauf und Befestigung vor dem Einschalten kontrollieren lassen.',
          'Leerlauf- und Niedriglastprüfung getrennt durchführen.',
          'Temperatur, Fehlercodes und Abschaltverhalten während der Prüfung protokollieren.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-vibrationen',
    path: '/hilfe/vibrationen',
    title: 'Vibrationen und Schläge aus dem Antrieb',
    model: 'Wildfire · Motor, Rad und Controller',
    intro: 'Vibrationen zwischen bestimmten Geschwindigkeiten können mechanisch oder elektrisch entstehen. Erst eingrenzen, dann einstellen oder reparieren.',
    steps: [
      'Geschwindigkeit, Last, Fahrmodus und Temperatur festhalten; bei einem neuen Schlag oder starken Ruck sofort anhalten.',
      'Reifen, Radlauf, Achsen, Motorbefestigung, Schwinge und sichtbare lose Teile äußerlich prüfen lassen.',
      'Erst danach Motor, Hall-/Phasenleitungen und Controllerparameter fachkundig abgleichen lassen.'
    ],
    safety: 'Bei starkem Ruckeln, ungewöhnlichem Motorgeräusch oder losem Fahrwerk nicht weiterfahren. PID-Werte nicht blind verändern.',
    sourceLabel: 'ElektroRoller-Forum · „Wildfire – starke Vibrationen aus dem Antrieb“ · Thema 48425',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48425',
    detailSections: [
      {
        title: '1. Mechanik und Rollseite trennen',
        paragraphs: ['Das Community-Fehlerbild tritt in einem begrenzten Geschwindigkeitsbereich auf. Zuerst werden Reifen, Rad, Achse, Schwinge und Befestigungen betrachtet, weil Unwucht oder Spiel ähnliche Symptome wie ein elektrischer Antriebsfehler erzeugen können.'],
        bullets: [
          'Reifendruck und sichtbare Schäden prüfen.',
          'Rad- und Schwingenbefestigung auf Spiel oder lose Teile prüfen lassen.',
          'Motorgeräusch ohne Belastung nicht mit einer Probefahrt erzwingen.'
        ]
      },
      {
        title: '2. Elektrische Ursache prüfen',
        paragraphs: ['Wenn die Mechanik unauffällig ist, müssen Motor, Hall-Sensoren, Phasenleitungen und Controller gemeinsam bewertet werden. Einzelne PID-Werte können ein Symptom verändern, beheben aber nicht automatisch die Ursache.'],
        bullets: [
          'Fehlercodes und Controllerprotokoll vor Änderungen sichern.',
          'Stecker und Kabel nur spannungsfrei durch eine Fachkraft prüfen lassen.',
          'Einstellungen nur schrittweise, dokumentiert und fahrzeugspezifisch ändern.'
        ]
      },
      {
        title: '3. Ergebnis verifizieren',
        paragraphs: ['Nach einer Reparatur oder Einstellung muss das Verhalten bei niedriger Last und anschließend unter kontrollierten Bedingungen wiederholt werden. Ein verschwundenes Geräusch ist noch kein Freigabekriterium.'],
        bullets: [
          'Temperatur und Fehlercodes während der Prüfung beobachten.',
          'Verwendete Werte, Teile und Datum speichern.',
          'Bei erneutem Schlag oder Ruck die Prüfung abbrechen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-gabelbruecke',
    path: '/hilfe/gabelbruecke',
    title: 'Gabelbrücke: Schrauben gerissen',
    model: 'Wildfire · Fahrwerk / sicherheitskritisch',
    intro: 'Gerissene oder unklare Befestigungsschrauben an der Gabelbrücke sind ein Abbruchsignal und keine schnelle Standardreparatur.',
    steps: [
      'Fahrzeug nicht weiterfahren und die betroffene Gabel, Brücke, Schraubenreste und mögliche Sturzspuren fotografieren.',
      'Schraubengröße, Länge, Festigkeitsklasse und Gewinde erst am tatsächlichen Bauteil prüfen — nicht aus einem ähnlichen Angebot ableiten.',
      'Gewindereste, Gabelausrichtung und mögliche Risse durch einen Fahrwerksbetrieb beurteilen lassen.'
    ],
    safety: 'Die im Thread genannten Drehmomentwerte widersprechen sich. Deshalb hier keinen pauschalen Wert verwenden; Freigabe und Drehmoment müssen zum konkreten Fahrzeugstand passen.',
    sourceLabel: 'ElektroRoller-Forum · „Wildfire – Gabelbrücke unten – Schrauben gerissen“ · Thema 49324',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=49324',
    detailSections: [
      {
        title: '1. Schaden sichern',
        paragraphs: ['An der unteren Gabelbrücke wurden abgerissene Schraubenköpfe und Unsicherheit über Größe und Drehmoment beschrieben. Das ist ein Fahrwerksschaden mit möglicher Auswirkung auf Spur und Lenkung.'],
        bullets: [
          'Nicht durch Anziehen einer beliebigen Ersatzschraube wieder fahrbereit machen.',
          'Gabelrohre, Brücke, Lenker und Radstellung auf sichtbare Verformung prüfen lassen.',
          'Schraubenreste nicht in die Brücke hineintreiben.'
        ]
      },
      {
        title: '2. Gewinde fachgerecht wiederherstellen',
        paragraphs: ['Je nach Lage lässt sich ein Rest ausdrehen oder das Gewinde muss professionell instandgesetzt werden. Vor dem Einbau werden Gewindetiefe, Schraubenlänge und Auflageflächen geprüft.'],
        bullets: [
          'Schraubenklasse und Abmessung am Bauteil beziehungsweise in einer passenden Unterlage verifizieren.',
          'Keine Schraube mit abweichender Länge oder Festigkeit einsetzen.',
          'Bei beschädigtem Aluminiumgewinde eine fachgerechte Gewindereparatur entscheiden lassen.'
        ]
      },
      {
        title: '3. Fahrwerk freigeben',
        paragraphs: ['Nach der Reparatur werden alle betroffenen Klemmungen, die Gabelausrichtung und das Vorderrad geprüft. Erst nach dokumentiertem korrektem Drehmoment und einer kurzen Standprüfung darf eine kontrollierte Probefahrt erfolgen.'],
        bullets: [
          'Drehmomentquelle und Fahrzeugrevision im Auftrag vermerken.',
          'Lenkung, Bremse und Geradeauslauf kontrollieren.',
          'Bei erneutem Knacken, Spiel oder Verdrehen sofort stoppen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-gabelabdichtung',
    path: '/hilfe/gabelabdichtung',
    title: 'Undichte Gabel abdichten',
    model: 'Wildfire · USD-Gabel',
    intro: 'Öl an der Gabel ist nicht nur ein Komfortproblem: Es kann die Bremsanlage und die Kontrolle über das Vorderrad beeinträchtigen.',
    steps: [
      'Fahrzeug abstellen und prüfen, ob Öl am Gabelrohr, an der Dichtung oder bereits an Bremsscheibe und Belag sitzt.',
      'Bei sichtbarem Ölfilm an der Bremse nicht weiterfahren; Gabeltyp und Modellstand fotografieren.',
      'Dichtung, Gabelrohr und Ölmenge nach der lokalen Community-PDF beziehungsweise durch einen Fahrwerksbetrieb instandsetzen lassen.'
    ],
    safety: 'Öl auf Bremsscheibe oder Belag bedeutet Fahrstopp. Dichtungswechsel und Gabelöffnung gehören in einen qualifizierten Fahrwerksbetrieb.',
    sourceLabel: 'BTM Community · lokale PDF „Gabelabdichtung“',
    sourceHref: '/pdfs/21-gabelabdichtung-community.pdf',
    detailSections: [
      {
        title: '1. Leckstelle und Bremsrisiko prüfen',
        paragraphs: ['Die lokale Community-PDF beschreibt die Reparaturspur an der Wildfire-Gabel. Vor jedem Teilekauf wird zuerst geklärt, ob es sich um leichte Verschmutzung, einen beschädigten Dichtlippenbereich oder einen echten Ölverlust handelt.'],
        bullets: [
          'Gabelrohr mit sauberem Tuch kontrollieren, ohne Schmutz in die Dichtung zu drücken.',
          'Bremsscheibe, Belag und Reifen auf Ölspuren prüfen.',
          'Bei Öl an der Bremse nicht mit Bremsenreiniger eine Freigabe vortäuschen.'
        ]
      },
      {
        title: '2. Dichtung und Gabelrohr instandsetzen',
        paragraphs: ['Eine neue Dichtung ist nur dann ausreichend, wenn das Gabelrohr keine Riefen oder Beschädigungen hat. Dichtungsart, Einbaurichtung und Füllmenge müssen zum konkreten Gabelstand passen.'],
        bullets: [
          'Gabeltyp und Baujahr vor dem Bestellen abgleichen.',
          'Dichtfläche und Rohr nach der Demontage auf Schäden prüfen lassen.',
          'Ölmenge und Anzugswerte aus der passenden Unterlage übernehmen.'
        ]
      },
      {
        title: '3. Brems- und Funktionsprüfung',
        paragraphs: ['Nach der Reparatur wird die Gabel mehrfach eingefedert und auf erneuten Ölfilm geprüft. Bremse, Geradeauslauf und Dämpfung werden separat kontrolliert, bevor das Bike wieder bewegt wird.'],
        bullets: [
          'Verunreinigte Beläge ersetzen statt nur oberflächlich reinigen.',
          'Bremsscheibe, Bremsdruck und Reifen nach der Reparatur prüfen.',
          'Erneuten Ölverlust dokumentieren und die Fahrt abbrechen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-vorderrad',
    path: '/hilfe/vorderrad',
    title: 'Vorderrad ausbauen und wieder einsetzen',
    model: 'Bonfire · Vorderrad / Bremse',
    intro: 'Der Ausbau ist machbar, aber Spacer, Bremsanlage, Achse und Drehmoment müssen in der richtigen Reihenfolge dokumentiert werden.',
    steps: [
      'Bike sicher entlasten, Vorderrad und beide Seiten fotografieren und die Lage aller Spacer markieren.',
      'Bremssattel und Bremsleitung nicht am Kabel hängen lassen; Achse und Befestigungen nur spannungsfrei lösen.',
      'Nach dem Einsetzen Radlauf, Bremsscheibe, Achse, Klemmungen und Bremsfunktion vor der Probefahrt prüfen.'
    ],
    safety: 'Arbeiten an Vorderrad und Bremse sind sicherheitskritisch. Das passende Drehmoment kommt aus der fahrzeugspezifischen Unterlage, nicht aus einem allgemeinen Fahrradwert.',
    sourceLabel: 'ElektroRoller-Forum · „Vorderrad-Ausbau Blacktea Bonfire?“ · Thema 48948',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48948',
    detailSections: [
      {
        title: '1. Vorbereitung',
        paragraphs: ['Vor dem Lösen wird die Einbausituation dokumentiert. Besonders die Reihenfolge und Position von Distanzhülsen, Bremssattel und Achse entscheidet darüber, ob das Rad später mittig läuft.'],
        bullets: [
          'Werkzeug, Unterlage und eine sichere Entlastung des Vorderrads vorbereiten.',
          'Spacer links und rechts getrennt ablegen und beschriften.',
          'Bremshebel während des ausgebauten Rads nicht betätigen.'
        ]
      },
      {
        title: '2. Rad ausbauen',
        paragraphs: ['Das Rad wird ohne Zug auf Bremsschlauch oder Kabel herausgenommen. Wenn Achse, Gabel oder Bremssattel nicht frei laufen, wird nicht mit Gewalt weitergearbeitet.'],
        bullets: [
          'Bremssattel bei Bedarf fachgerecht abnehmen und sicher ablegen.',
          'Achse, Mutter und Klemmungen geordnet aufbewahren.',
          'Rad, Lager, Reifen und Bremsscheibe auf Schäden prüfen.'
        ]
      },
      {
        title: '3. Einbau und Prüfung',
        paragraphs: ['Nach dem Einsetzen muss das Rad frei laufen und die Bremsscheibe mittig im Sattel stehen. Drehmoment, Bremsdruck und Geradeauslauf werden vor jeder öffentlichen Fahrt kontrolliert.'],
        bullets: [
          'Spacer in der dokumentierten Position einsetzen.',
          'Befestigungen mit dem passenden fahrzeugspezifischen Drehmoment anziehen.',
          'Bremse im Stand mehrfach betätigen und danach eine sehr kurze kontrollierte Prüfung durchführen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-hinterrad',
    path: '/hilfe/hinterrad',
    title: 'Hinterrad und Nabenmotor prüfen',
    model: 'Wildfire · Hinterrad / Nabenmotor',
    intro: 'Am Hinterrad treffen Reifen, Bremse, Lager, Achse und Motorleitung zusammen. Deshalb wird jeder Arbeitsschritt dokumentiert.',
    steps: [
      'Bike sicher abstellen und Kabelverlauf, Achsseiten, Spacer und Bremse fotografieren.',
      'Reifen, Felge, Lager, Bremse und sichtbare Motorleitung äußerlich prüfen; nichts am Hochvoltanschluss öffnen.',
      'Nach der Arbeit Radlauf, Kabelschutz, Bremsfunktion und fahrzeugspezifisches Achsdrehmoment kontrollieren.'
    ],
    safety: 'Nabenmotor und Hochvoltverkabelung nicht unter Spannung trennen. Bei beschädigter Motorleitung, Lager-Spiel oder Bremsproblemen Fachbetrieb einschalten.',
    sourceLabel: 'ElektroRoller-Forum · „Wildfire Hinterrad reparieren“ · Thema 48744',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48744',
    detailSections: [
      {
        title: '1. Befund aufnehmen',
        paragraphs: ['Beim Hinterrad werden zunächst Rollgeräusch, Spiel, Reifenzustand, Bremsscheibe und sichtbare Kabelbeschädigungen getrennt erfasst. Ein schwergängiges Rad kann mechanisch oder elektrisch verursacht sein.'],
        bullets: [
          'Rad und Kabel nicht am Boden schleifen lassen.',
          'Achsseiten, Unterlegteile und Kabelhalter markieren.',
          'Bei Schleifen, Rissen oder starkem Spiel nicht weiterfahren.'
        ]
      },
      {
        title: '2. Rad und Motorleitung schützen',
        paragraphs: ['Der Nabenmotor wird beim Ausbau nicht an der Leitung gezogen oder verdreht. Die Leitung muss spannungsfrei, geschützt und mit ausreichendem Abstand zu Reifen und Bremse verlegt sein.'],
        bullets: [
          'Stecker nur nach sicherer Spannungsfreischaltung und durch eine Fachkraft lösen.',
          'Kabel auf Scheuerstellen, Knicke und lose Zugentlastung prüfen.',
          'Lager, Achse und Bremse getrennt vom Motor bewerten.'
        ]
      },
      {
        title: '3. Montage und Laufprüfung',
        paragraphs: ['Nach der Montage wird das Hinterrad frei von Hand bewegt. Erst wenn Ausrichtung, Bremsanlage, Kabelschutz und Befestigung stimmen, folgt eine kurze kontrollierte Funktionsprüfung.'],
        bullets: [
          'Achsmuttern mit dem passenden Fahrzeugwert anziehen.',
          'Bremse und Reifensitz vor dem Einschalten prüfen.',
          'Bei ungewöhnlichem Geräusch, Ruckeln oder Kabelzug sofort abbrechen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-laden',
    path: '/hilfe/laden',
    title: 'Laden bricht ab oder Typ 2 startet nicht',
    model: 'Bonfire & Wildfire · Laden / BMS',
    intro: 'Wenn der Ladeziegel oder eine öffentliche AC-Säule nicht lädt, werden Strompfad, Kabel, Akkuzustand und BMS getrennt geprüft.',
    steps: [
      'Ladegerät, Kabel, Steckdose oder Säule, Akkuzahl und Anzeigezustand dokumentieren.',
      'Nur das passende Ladegerät und ein passendes Typ-2-Kabel verwenden; bei Abbruch nicht wiederholt unter denselben Bedingungen starten.',
      'Temperatur, Ladezustand, BMS-Meldung und LED-Verhalten fachkundig prüfen lassen, bevor Ladeparameter geändert werden.'
    ],
    safety: 'Nicht laden bei Wärme, Geruch, sichtbarem Akkuschaden oder unter 0 °C. Ladegerät und Akku nicht öffnen und keine Ladeleitung überbrücken.',
    sourceLabel: 'ElektroRoller-Forum · „Wildfire – Laden Steckdose und Typ 2 öffentlich“ · Thema 44905',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=44905',
    detailSections: [
      {
        title: '1. Ladefehler unterscheiden',
        paragraphs: ['Das Forum dokumentiert unterschiedliche Fälle an Schuko, Ladeziegel und öffentlicher Typ-2-Säule. Ein Ladeabbruch kann vom Kabel, Ladegerät, BMS, Akkuzustand, der Temperatur oder der Kommunikation kommen.'],
        bullets: [
          'Ort, Beginn und Dauer des Ladevorgangs notieren.',
          'LEDs, App-Werte und Fehlermeldungen fotografieren.',
          'Bei nur einem betroffenen Akku die Akkus nicht beliebig vertauschen, sondern getrennt dokumentieren.'
        ]
      },
      {
        title: '2. Temperatur und Strompfad prüfen',
        paragraphs: ['Die lokale Wartungszusammenfassung nennt temperaturabhängige Ladegrenzen und eine Abkühlphase nach der Fahrt. Konkrete Stromwerte bleiben modell- und versionsabhängig und dürfen nicht ungeprüft übernommen werden.'],
        bullets: [
          'Akku vor dem Laden abkühlen lassen und bei Frost nicht laden.',
          'Passendes Ladegerät, Kabel, Steckverbindungen und Sicherung prüfen lassen.',
          'Ladeleistung nicht erhöhen, um einen Abbruch zu erzwingen.'
        ]
      },
      {
        title: '3. Öffentliche AC-Säule',
        paragraphs: ['Bei Typ 2 wird die Kommunikation zwischen Säule, Kabel und Fahrzeug betrachtet. Ein passendes Kabel und die freigegebene Fahrzeugkonfiguration sind Voraussetzung; die Säule ist keine Reparaturumgehung für einen BMS- oder Ladefehler.'],
        bullets: [
          'Mit einer bekannten funktionierenden Säule und einem geprüften Kabel vergleichen.',
          'Ladeeinstellungen nur nach dokumentiertem Fahrzeugstand ändern.',
          'Bei erneutem Abbruch Ladevorgang beenden und Fehlerdaten sichern.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-nfc',
    path: '/hilfe/nfc',
    title: 'NFC / Keyless nachrüsten und prüfen',
    model: 'Wildfire · Startsystem',
    intro: 'Beim NFC-Umbau zählen Modul, Stecker, Einbauort und Funktionsprüfung — nicht das Verbinden von Kabeln nach Farben.',
    steps: [
      'Vor dem Umbau den funktionierenden Keyless-Zustand, Modulstecker und Einbauort fotografieren.',
      'Akkuversorgung trennen und nur das zum Wildfire-Modell passende NFC-Modul mit passendem Stecker einsetzen.',
      'Nach dem Einbau Karte, Taster, Signalton und Controllerfreigabe getrennt prüfen.'
    ],
    safety: 'Keine Kabel nach Vermutung umstecken oder verbinden. Bei fehlender Freigabe das Originalsystem wieder einsetzen lassen und den Umbau prüfen.',
    sourceLabel: 'ElektroRoller-Forum · „Wildfire: NFC, aber wie einbauen?“ · Thema 46657',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=46657',
    detailSections: [
      {
        title: '1. Modul und Fahrzeugstand identifizieren',
        paragraphs: ['Im Community-Thread werden verschiedene Einbauorte und unterschiedliche Modellstände beschrieben. Deshalb wird zuerst geklärt, welches Keyless-Modul vorhanden ist und welche Wildfire-Revision vorliegt.'],
        bullets: [
          'Stecker, Modul, Taster und vorhandene Halterung fotografieren.',
          'Vorhandene Originalteile aufbewahren und nicht voreilig entsorgen.',
          'Einbauvideo oder passende Anleitung der eigenen Variante zuordnen.'
        ]
      },
      {
        title: '2. Einbau ohne Kabel-Experiment',
        paragraphs: ['Das NFC-Modul wird mechanisch sicher befestigt und über den passenden Steckverbinder eingebunden. Kabel werden nicht nach Farbe oder einem ähnlichen Fahrzeugplan verändert.'],
        bullets: [
          'Akkuversorgung vor dem Abstecken trennen.',
          'Einbauort so wählen, dass Taster, Dichtung und Kabel nicht scheuern.',
          'Keine Bohrung in abnehmbare Teile setzen, wenn eine feste alternative Position möglich ist.'
        ]
      },
      {
        title: '3. Funktion testen',
        paragraphs: ['Eine funktionierende NFC-Freigabe wird durch Reaktion des Tasters, Signalton und das Startverhalten bestätigt. Bluetooth-Kopplung allein ist kein Beweis für eine vollständige Fahrzeugfreigabe.'],
        bullets: [
          'Beide Karten beziehungsweise vorhandene Schlüssel getrennt testen.',
          'Tasterlicht, Signalton und Displayreaktion dokumentieren.',
          'Bei fehlender Freigabe nicht weiterfahren und Original-Keyless wiederherstellen lassen.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-qs8',
    path: '/hilfe/qs8',
    title: 'QS8-Akkuanschluss sicher prüfen',
    model: 'Bonfire · Akkuanschluss / Hochstrom',
    intro: 'Ein QS8-Ersatz oder eine externe Lademöglichkeit darf nicht nach Optik ausgewählt werden. Stecker, Polung und BMS müssen zusammenpassen.',
    steps: [
      'Vor dem Kauf Steckerhälfte, Kabelquerschnitt, Polung, Anti-Spark-Ausführung und mechanische Verriegelung am eigenen Akku dokumentieren.',
      'Keine externe Lade- oder Adapterlösung improvisieren und keinen beschädigten Hochstromstecker weiterverwenden.',
      'Austausch, Crimpung und Isolationsprüfung durch einen qualifizierten Betrieb durchführen lassen.'
    ],
    safety: 'QS8-Stecker führen hohe Ströme. Akku nicht kurzschließen, nicht unter Spannung trennen und BMS- oder Ladeleitungen niemals überbrücken.',
    sourceLabel: 'ElektroRoller-Forum · „Bonfireakkus dauerhaft außerhalb laden: QS8-Alternative?“ · Thema 48743',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=48743',
    detailSections: [
      {
        title: '1. Vorhandenen Anschluss erfassen',
        paragraphs: ['Der Stecker wird mit Akkuvariante und Kabelausführung erfasst. QS8 ist keine vollständige Spezifikation für Anti-Spark, Polung, Leitungsquerschnitt oder mechanischen Einbau.'],
        bullets: [
          'Steckerhälfte und Kontakte von außen fotografieren.',
          'Kabelquerschnitt, Länge und Zugentlastung notieren.',
          'Akku- und Ladeanschluss nicht anhand einer Internetabbildung identifizieren.'
        ]
      },
      {
        title: '2. Kompatibilität prüfen',
        paragraphs: ['Ein passender Stecker muss elektrisch und mechanisch zum Akku, Ladegerät und Fahrzeug passen. Die Anti-Spark-Funktion und die BMS-Logik dürfen durch einen Adapter nicht umgangen werden.'],
        bullets: [
          'Polung und Steckrichtung fachkundig messen lassen.',
          'Stromrating und Temperaturfestigkeit vergleichen.',
          'Adapterlösungen nur mit dokumentierter Freigabe einsetzen.'
        ]
      },
      {
        title: '3. Montage und Prüfung',
        paragraphs: ['Nach dem Austausch werden Crimpung, Isolation, Zugentlastung und Erwärmung unter kontrollierter Last geprüft. Ein äußerlich passender Stecker ist ohne diese Prüfung keine Reparaturfreigabe.'],
        bullets: [
          'Kontaktflächen sauber und geschützt halten.',
          'Kabel so verlegen, dass kein Zug oder Scheuern entsteht.',
          'Bei Wärme, Geruch, Funken oder Verfärbung sofort abschalten.'
        ]
      }
    ],
  },
  {
    id: 'hilfe-wartung',
    path: '/hilfe/wartung',
    title: 'Reifen, Bremsen und Lager warten',
    model: 'Bonfire & Wildfire · Wartung',
    intro: 'Regelmäßige Sicht- und Funktionskontrollen verhindern, dass aus Reifen-, Brems- oder Lagerspiel ein Sicherheitsproblem wird.',
    steps: [
      'Reifendruck, Profil, Speichen, Felgen, Bremsbeläge und Bremsscheiben bei kaltem Fahrzeug prüfen.',
      'Vorderradlager, Lenkkopflager, Schwinge, Federbeine und Befestigungen auf Spiel oder Korrosion prüfen lassen.',
      'Drehmomente und Intervalle aus dem passenden Handbuch oder der lokalen Wartungs-PDF übernehmen.'
    ],
    safety: 'Bei Rissen, starkem Spiel, beschädigten Speichen, Öl an der Bremse oder schlechter Bremswirkung nicht weiterfahren.',
    sourceLabel: 'ElektroRoller-Forum · „Zusammenfassung von Tipps“ · Thema 47365',
    sourceHref: 'https://www.elektroroller-forum.de/viewtopic.php?t=47365',
    detailSections: [
      {
        title: '1. Reifen und Räder',
        paragraphs: ['Die Community-Zusammenfassung nennt regelmäßige Luftdruckkontrolle und Prüfungen an Reifen, Speichen und Rädern. Die tatsächlichen Werte werden immer mit dem konkreten Reifen und Fahrzeugstand abgeglichen.'],
        bullets: [
          'Druck am kalten Reifen messen und dokumentieren.',
          'Profil, Fremdkörper, Risse, Felgenlauf und Speichenspannung kontrollieren.',
          'Bei Unwucht oder Seitenschlag Werkstattprüfung veranlassen.'
        ]
      },
      {
        title: '2. Bremsen und Lager',
        paragraphs: ['Bremsbelag, Bremsscheibe, Bremsleitung und Bremsflüssigkeit gehören zu den sicherheitsrelevanten Wartungspunkten. Lager und Lenkkopf werden auf Spiel und Rastpunkte geprüft, nicht nur nach Gefühl nachgezogen.'],
        bullets: [
          'Bremsbelagstärke und Scheibenoberfläche kontrollieren.',
          'Bremshebel, Druckpunkt und sichtbare Leckagen prüfen.',
          'Rad- und Lenkkopflager bei Spiel oder Rastpunkt fachkundig instandsetzen lassen.'
        ]
      },
      {
        title: '3. Korrosion und Befestigungen',
        paragraphs: ['Schwarz lackierte Stahlteile, Speichen, Schwinge, Federbeine und elektrische Steckkontakte werden sauber gehalten und gegen Korrosion geschützt. Schutzmittel dürfen nicht auf Bremsflächen gelangen.'],
        bullets: [
          'Stecker nur spannungsfrei und äußerlich auf Feuchtigkeit prüfen.',
          'Korrosionsschutz von Bremsscheibe, Belägen und Reifen fernhalten.',
          'Geprüfte Drehmomente, Datum und Befund im Wartungsdatensatz speichern.'
        ]
      }
    ],
  },
);

const sourcingCards: SourcingCard[] = [
  {
    title: 'MCB833 Bremsbelag',
    category: 'Bonfire · sicherheitskritisch',
    status: 'Amazon-Treffer · Passform prüfen',
    summary: 'Die Teilenummer MCB833 ist auf Amazon auffindbar und wird im Forum als mögliche Spur genannt. Belagform, Dicke, Halterung und Bonfire-Variante vor dem Kauf vergleichen.',
    amazon: { label: 'MCB833 bei Amazon prüfen', href: 'https://www.amazon.de/TRW-Lucas-MCB833-Scheibenbremsbelag-Organisch/dp/B0068NSX98' },
  },
  {
    title: 'Heidenau K60 90/90-18 51S TT',
    category: 'Bonfire · Reifen vorn',
    status: 'Handbuchabgleich',
    summary: 'Modell und Größe entsprechen einem Eintrag im lokal gesicherten Bonfire-Handbuch. Traglast, Geschwindigkeitsindex, Felge und Zulassung vor der Bestellung prüfen.',
    amazon: { label: 'K60 bei Amazon prüfen', href: 'https://www.amazon.de/dp/B01J15271E' },
  },
  {
    title: 'Heidenau K36 3.50-18 62S',
    category: 'Bonfire · Reifen vorn/offroad',
    status: 'Handbuchabgleich',
    summary: 'Profilbezeichnung und Größe entsprechen dem lokal gesicherten Bonfire-Handbuch. Felge, Traglast, Index, Fahrzeugvariante und Zulassung vor der Bestellung prüfen.',
    amazon: { label: 'K36 bei Amazon prüfen', href: 'https://www.amazon.de/dp/B005T38X0W' },
  },
  {
    title: 'Heidenau K60 110/80-18 58S TT',
    category: 'Bonfire · Reifen hinten',
    status: 'Handbuchabgleich',
    summary: 'Modell und Größe entsprechen dem lokal gesicherten Bonfire-Handbuch. Reifenfreigabe, Traglast, Geschwindigkeitsindex und Felge am eigenen Fahrzeug prüfen.',
    amazon: { label: 'K60 hinten bei Amazon prüfen', href: 'https://www.amazon.de/dp/B01J1550QI' },
  },
  {
    title: '58,8-V-/10-A-Ladegerät mit XLR',
    category: 'Bonfire · Ladegerät',
    status: 'Technischer Treffer',
    summary: '58,8 V, 10 A, 14S-Lithium und 3-poliger XLR passen zu archivierten Eckdaten. Pinbelegung und Ladekennlinie bleiben vor der Nutzung zu prüfen.',
    amazon: { label: 'Ladegerät bei Amazon prüfen', href: 'https://www.amazon.de/dp/B0D8KDB742' },
  },
  {
    title: 'USB-Ladebuchse mit Schalter',
    category: 'Wildfire · 12-V-Elektrik',
    status: 'Forum-Bericht · prüfen',
    summary: 'Dieser USB-Port wurde im Wildfire-Forum erfolgreich nachgerüstet. Bohrung, 12-V-Versorgung, Sicherung und Kabelweg an der eigenen Maschine vergleichen.',
    amazon: { label: 'USB-Port bei Amazon prüfen', href: 'https://www.amazon.de/dp/B0F9K6QV46' },
  },
];

const normalizePath = (value: string) => value.replace(/\/+$/, '') || '/';
const slugify = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const getLocationKey = () => typeof window === 'undefined'
  ? '/'
  : `${normalizePath(window.location.pathname)}${window.location.hash}`;
const siteOrigin = (import.meta.env.VITE_SITE_URL || siteConfig.siteOrigin).replace(/\/+$/, '');

type BikeProfile = {
  slug: 'bonfire' | 'wildfire';
  path: string;
  name: string;
  intro: string;
  description: string;
};

const bikeProfiles: BikeProfile[] = [
  {
    slug: 'bonfire',
    path: '/bikes/bonfire',
    name: 'Bonfire',
    intro: 'Die Wiki-Seite zur Black Tea Bonfire wird gerade aus den lokal gesicherten Handbüchern und belegten Quellen aufgebaut.',
    description: 'Technische Wiki-Seite zur Black Tea Bonfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.',
  },
  {
    slug: 'wildfire',
    path: '/bikes/wildfire',
    name: 'Wildfire',
    intro: 'Die Wiki-Seite zur Black Tea Wildfire wird gerade aus den lokal gesicherten Handbüchern und belegten Quellen aufgebaut.',
    description: 'Technische Wiki-Seite zur Black Tea Wildfire mit Handbuchdaten, Modellvarianten und nachvollziehbaren Quellen.',
  },
];

const wikiMarkdownModules = import.meta.glob('../../content/wiki/**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function parseWikiMarkdown(source: string, filePath: string): WikiArticle {
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fields: Record<string, string> = {};
  const body = frontmatterMatch?.[2] ?? source;

  for (const line of (frontmatterMatch?.[1] ?? '').split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^("|')([\s\S]*)\1$/, '$2');
    fields[key] = value;
  }

  const relativePath = filePath.match(/content\/wiki\/(.+)$/)?.[1] ?? filePath.split('/').slice(-2).join('/');
  const articlePath = relativePath.replace(/\.md$/, '').replace(/\/index$/, '');
  const path = `/bikes/${articlePath}`;

  return {
    slug: articlePath.replace(/\//g, '-'),
    path,
    title: fields.title ?? articlePath,
    model: fields.model ?? 'Bikes',
    intro: fields.intro ?? 'Redaktionell aufbereiteter Wiki-Artikel aus lokal gesicherten Quellen.',
    status: fields.status ?? 'Entwurf',
    sourceHref: fields.source,
    sourceLabel: fields.sourceLabel,
    body: body.trim(),
  };
}

const wikiArticles = Object.entries(wikiMarkdownModules)
  .map(([filePath, source]) => parseWikiMarkdown(source, filePath))
  .sort((left, right) => left.title.localeCompare(right.title, 'de'));

function slugifyWikiHeading(value: string): string {
  return value
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'abschnitt';
}

function getWikiToc(body: string): WikiTocItem[] {
  const usedIds = new Map<string, number>();
  const items: WikiTocItem[] = [];

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const label = match[2].trim();
    const baseId = slugifyWikiHeading(label);
    const occurrence = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, occurrence + 1);
    items.push({ id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`, label, level });
  }

  return items;
}

function highlightWikiText(value: string, query: string, keyPrefix: string): ReactNode[] {
  const searchTerm = query.trim();
  const normalizedValue = value.toLocaleLowerCase('de');
  const normalizedQuery = searchTerm.toLocaleLowerCase('de');
  if (!normalizedQuery) return [value];

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
  while (matchIndex >= 0) {
    if (matchIndex > cursor) nodes.push(value.slice(cursor, matchIndex));
    nodes.push(<mark className="wiki-search-highlight" key={`${keyPrefix}-match-${nodes.length}`}>{value.slice(matchIndex, matchIndex + searchTerm.length)}</mark>);
    cursor = matchIndex + searchTerm.length;
    matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length ? nodes : [value];
}

function renderWikiInlineMarkdown(value: string, keyPrefix: string, query = ''): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(...highlightWikiText(value.slice(cursor, match.index), query, `${keyPrefix}-plain-${nodes.length}`));
    const key = `${keyPrefix}-${nodes.length}`;
    if (match[1] && match[2] && (match[2].startsWith('/') || /^https?:\/\//i.test(match[2]))) {
      const external = /^https?:\/\//i.test(match[2]);
      nodes.push(<a key={key} href={match[2]} target={external ? '_blank' : undefined} rel={external ? 'nofollow noreferrer' : undefined}>{highlightWikiText(match[1], query, `${key}-link`)}</a>);
    } else if (match[3]) {
      nodes.push(<strong key={key}>{highlightWikiText(match[3], query, `${key}-strong`)}</strong>);
    } else if (match[4]) {
      nodes.push(<code key={key}>{highlightWikiText(match[4], query, `${key}-code`)}</code>);
    } else if (match[5]) {
      nodes.push(<em key={key}>{highlightWikiText(match[5], query, `${key}-emphasis`)}</em>);
    } else {
      nodes.push(...highlightWikiText(match[0], query, `${key}-fallback`));
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) nodes.push(...highlightWikiText(value.slice(cursor), query, `${keyPrefix}-plain-end`));
  return nodes;
}

function parseWikiTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isWikiTableSeparator(line: string): boolean {
  return parseWikiTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderWikiMarkdown(body: string, onEditHeading: (heading: string) => void, query = ''): ReactNode[] {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length === 2 ? 'h2' : 'h3';
      const Heading = level;
      const heading = headingMatch[2].trim();
      blocks.push(<Heading key={`wiki-block-${index}`} id={slugifyWikiHeading(heading)}><span className="wiki-heading-text">{highlightWikiText(heading, query, `wiki-heading-${index}`)}</span><button className="wiki-heading-edit" type="button" onClick={() => onEditHeading(heading)}>Bearbeiten</button></Heading>);
      index += 1;
      continue;
    }

    if (line.trim().startsWith('|') && index + 1 < lines.length && lines[index + 1].trim().startsWith('|') && isWikiTableSeparator(lines[index + 1])) {
      const header = parseWikiTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(parseWikiTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className="wiki-table-wrap" key={`wiki-block-${index}`}>
          <table>
            <thead><tr>{header.map((cell, cellIndex) => <th key={`wiki-table-head-${cellIndex}`}>{renderWikiInlineMarkdown(cell, `wiki-table-head-${cellIndex}`, query)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={`wiki-table-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`wiki-table-cell-${rowIndex}-${cellIndex}`}>{renderWikiInlineMarkdown(cell, `wiki-table-cell-${rowIndex}-${cellIndex}`, query)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (unorderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }
      blocks.push(<ul key={`wiki-block-${index}`}>{items.map((item, itemIndex) => <li key={`wiki-list-item-${itemIndex}`}>{renderWikiInlineMarkdown(item, `wiki-list-item-${itemIndex}`, query)}</li>)}</ul>);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }
      blocks.push(<ol key={`wiki-block-${index}`}>{items.map((item, itemIndex) => <li key={`wiki-ordered-item-${itemIndex}`}>{renderWikiInlineMarkdown(item, `wiki-ordered-item-${itemIndex}`, query)}</li>)}</ol>);
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`wiki-block-${index}`}>{quoteLines.map((quote, quoteIndex) => <span key={`wiki-quote-${quoteIndex}`}>{quoteIndex > 0 ? ' ' : ''}{renderWikiInlineMarkdown(quote, `wiki-quote-${quoteIndex}`, query)}</span>)}</blockquote>);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index];
      if (paragraphLines.length > 0 && (/^(#{2,3})\s+/.test(current) || /^\s*[-*]\s+/.test(current) || /^\s*\d+[.)]\s+/.test(current) || current.trim().startsWith('>') || (current.trim().startsWith('|') && index + 1 < lines.length && lines[index + 1].trim().startsWith('|') && isWikiTableSeparator(lines[index + 1])))) break;
      paragraphLines.push(current);
      index += 1;
    }
    blocks.push(<p key={`wiki-block-${index}`}>{paragraphLines.flatMap((paragraphLine, lineIndex) => [...(lineIndex > 0 ? [' '] : []), ...renderWikiInlineMarkdown(paragraphLine, `wiki-paragraph-${index}-${lineIndex}`, query)])}</p>);
  }

  return blocks;
}

function getWikiSearchMatches(query: string): Array<{ article: WikiArticle; sections: WikiTocItem[] }> {
  const normalizedQuery = query.trim().toLocaleLowerCase('de');
  if (!normalizedQuery) return wikiArticles.map((article) => ({ article, sections: getWikiToc(article.body) }));

  return wikiArticles.flatMap((article) => {
    const sections = getWikiToc(article.body);
    const searchable = `${article.title} ${article.model} ${article.intro} ${sections.map((section) => section.label).join(' ')} ${article.body}`.toLocaleLowerCase('de');
    if (!searchable.includes(normalizedQuery)) return [];
    return [{ article, sections: sections.filter((section) => section.label.toLocaleLowerCase('de').includes(normalizedQuery)) }];
  });
}

function getWikiArticleSearchResults(body: string, query: string): WikiTocItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('de');
  if (!normalizedQuery) return [];

  const usedIds = new Map<string, number>();
  const sections: Array<WikiTocItem & { text: string }> = [];
  let current: (WikiTocItem & { text: string }) | null = null;

  const finishSection = () => {
    if (current) sections.push(current);
  };

  for (const line of body.split(/\r?\n/)) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      finishSection();
      const label = headingMatch[2].trim();
      const baseId = slugifyWikiHeading(label);
      const occurrence = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, occurrence + 1);
      current = { id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`, label, level: headingMatch[1].length as 2 | 3, text: '' };
      continue;
    }
    if (current) current.text += ` ${line}`;
  }
  finishSection();

  return sections
    .filter((section) => `${section.label} ${section.text}`.toLocaleLowerCase('de').includes(normalizedQuery))
    .map(({ id, label, level }) => ({ id, label, level }));
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: 'same-origin', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload === 'object' && payload !== null && 'error' in payload ? String(payload.error) : 'Die Anfrage konnte nicht verarbeitet werden.');
  }
  return payload as T;
}

const COOKIE_CONSENT_KEY = 'btm-cookie-consent';

function setOptionalServiceConsent(choice: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  } catch {
    // A blocked local storage must never break the website or the login flow.
  }

  document.documentElement.dataset.optionalServices = choice === 'accepted' ? 'allowed' : 'blocked';
  window.dispatchEvent(new CustomEvent('btm-cookie-consent-changed', { detail: choice }));
}

const normaliseDisplayName = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9äöüß]/g, '')
  .slice(0, 80);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refreshSession = async () => {
      try {
        const session = await apiJson<{ authenticated: boolean; user: AuthUser | null; csrfToken: string | null }>('/api/auth/session');
        if (!active) return;
        setUser(session.authenticated ? session.user : null);
        setCsrfToken(session.csrfToken ?? '');
      } catch {
        if (!active) return;
        setUser(null);
        setCsrfToken('');
      } finally {
        if (active) setLoading(false);
      }
    };
    void refreshSession();
    const refreshTimer = window.setInterval(() => { void refreshSession(); }, 60000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const session = await apiJson<{ user: AuthUser; csrfToken: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setUser(session.user);
    setCsrfToken(session.csrfToken);
  };

  const register = async (name: string, email: string, password: string, passwordConfirm: string) => {
    const response = await apiJson<{ message: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, passwordConfirm }),
    });
    return response.message;
  };

  const logout = async () => {
    await apiJson('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    setUser(null);
    setCsrfToken('');
  };

  const updateProfile = async (profile: Pick<AuthUser, 'name' | 'model' | 'kilometers' | 'notifyReplies' | 'newsletterSubscribed'>) => {
    const response = await apiJson<{ user: AuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(profile),
    });
    setUser(response.user);
  };

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await apiJson<{ user: AuthUser }>('/api/auth/avatar', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: formData,
    });
    setUser(response.user);
  };

  const markNotificationRead = async (id: string) => {
    const response = await apiJson<{ notifications: AuthNotification[] }>(`/api/auth/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    });
    setUser((current) => current ? { ...current, notifications: response.notifications } : current);
  };

  return <AuthContext.Provider value={{ user, csrfToken, loading, login, register, logout, updateProfile, uploadAvatar, markNotificationRead }}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  return context;
}

type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  jsonLd: Record<string, unknown>;
};

const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${siteOrigin}/#website`,
  name: 'Black Tea Motorbikes – Hilfe',
  url: `${siteOrigin}/`,
  inLanguage: 'de-DE',
};

const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

function getSeoMetadata(path: string, guide?: RepairGuide, part?: HistoricalShopPart, bike?: BikeProfile, wikiArticle?: WikiArticle): SeoMetadata {
  if (path === '/admin' || path === '/login' || path === '/registrieren' || path === '/konto' || path === '/passwort-zuruecksetzen') {
    return {
      title: path === '/konto' ? 'Mein Bereich — Black Tea Motorbikes – Hilfe' : path === '/registrieren' ? 'Registrieren — Black Tea Motorbikes – Hilfe' : path === '/login' ? 'Einloggen — Black Tea Motorbikes – Hilfe' : path === '/passwort-zuruecksetzen' ? 'Passwort zurücksetzen — Black Tea Motorbikes – Hilfe' : 'Admin — Black Tea Motorbikes – Hilfe',
      description: 'Persönlicher Bereich von Black Tea Motorbikes – Hilfe.',
      canonicalPath: path,
      robots: 'noindex,nofollow,noarchive',
      jsonLd: {},
    };
  }

  if (getRepairRequestId(path)) {
    return {
      title: 'Reparaturanfrage — Black Tea Motorbikes – Hilfe',
      description: 'Freigegebene Reparaturanfrage zu einem Black Tea Bike mit Platz für nachvollziehbare Antworten und Lösungsansätze.',
      canonicalPath: path,
      robots: 'noindex,follow,noarchive',
      jsonLd: {},
    };
  }

  if (guide) {
    return {
      title: `${guide.title} — Black Tea Motorbikes – Hilfe`,
      description: guide.intro,
      canonicalPath: guide.path,
      robots: 'index,follow,max-image-preview:large',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteSchema,
          {
            '@type': 'HowTo',
            '@id': `${siteOrigin}${guide.path}#howto`,
            name: guide.title,
            description: guide.intro,
            url: `${siteOrigin}${guide.path}`,
            inLanguage: 'de-DE',
            dateModified: '2026-09-02',
            step: guide.steps.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: `Prüfschritt ${index + 1}`,
              text: step,
            })),
          },
          breadcrumbSchema([
            { name: 'Startseite', url: `${siteOrigin}/` },
            { name: 'Reparaturhilfe', url: `${siteOrigin}/hilfe` },
            { name: guide.title, url: `${siteOrigin}${guide.path}` },
          ]),
        ],
      },
    };
  }

  if (part) {
    const description = `${part.title} für ${part.model}: historischer BTM-Shop-Eintrag mit lokal gesicherten Archivdaten und Bezugsstatus ohne unbestätigte Kaufempfehlung.`;
    return {
      title: `${part.title} — Ersatzteil — Black Tea Motorbikes – Hilfe`,
      description,
      canonicalPath: part.path,
      robots: 'index,follow,max-image-preview:large',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteSchema,
          {
            '@type': 'Product',
            '@id': `${siteOrigin}${part.path}#product`,
            name: part.title,
            description,
            url: `${siteOrigin}${part.path}`,
            category: part.category,
            sku: `btm-${part.id}`,
            brand: { '@type': 'Brand', name: 'Black Tea Motorbikes' },
            isRelatedTo: { '@type': 'Vehicle', name: part.model },
          },
          breadcrumbSchema([
            { name: 'Startseite', url: `${siteOrigin}/` },
            { name: 'Ersatzteile', url: `${siteOrigin}/ersatzteile` },
            { name: part.title, url: `${siteOrigin}${part.path}` },
          ]),
        ],
      },
    };
  }

  if (wikiArticle) {
    return {
      title: `${wikiArticle.title} — ${wikiArticle.model} — Black Tea Motorbikes – Hilfe`,
      description: wikiArticle.intro,
      canonicalPath: wikiArticle.path,
      robots: 'index,follow,max-image-preview:large',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteSchema,
          {
            '@type': 'Article',
            '@id': `${siteOrigin}${wikiArticle.path}#article`,
            headline: wikiArticle.title,
            description: wikiArticle.intro,
            url: `${siteOrigin}${wikiArticle.path}`,
            inLanguage: 'de-DE',
            isPartOf: { '@id': `${siteOrigin}/#website` },
            about: { '@type': 'Vehicle', name: wikiArticle.model, brand: { '@type': 'Brand', name: 'Black Tea Motorbikes' } },
          },
          breadcrumbSchema([
            { name: 'Startseite', url: `${siteOrigin}/` },
            { name: 'Bikes', url: `${siteOrigin}/bikes/${wikiArticle.model.toLowerCase()}` },
            { name: wikiArticle.title, url: `${siteOrigin}${wikiArticle.path}` },
          ]),
        ],
      },
    };
  }

  if (bike) {
    return {
      title: `${bike.name} — Bikes — Black Tea Motorbikes – Hilfe`,
      description: bike.description,
      canonicalPath: bike.path,
      robots: 'index,follow,max-image-preview:large',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteSchema,
          {
            '@type': 'WebPage',
            '@id': `${siteOrigin}${bike.path}#webpage`,
            name: `${bike.name} — Bikes — Black Tea Motorbikes – Hilfe`,
            description: bike.description,
            url: `${siteOrigin}${bike.path}`,
            inLanguage: 'de-DE',
            about: { '@type': 'Vehicle', name: bike.name, brand: { '@type': 'Brand', name: 'Black Tea Motorbikes' } },
          },
          breadcrumbSchema([
            { name: 'Startseite', url: `${siteOrigin}/` },
            { name: 'Bikes', url: `${siteOrigin}${bike.path}` },
            { name: bike.name, url: `${siteOrigin}${bike.path}` },
          ]),
        ],
      },
    };
  }

  const metadata: Record<string, { title: string; description: string }> = {
    '/': {
      title: 'Black Tea Motorbikes – Hilfe — Dokumente, Ersatzteile & Updates',
      description: 'Unabhängige Sammelstelle für Black Tea Motorbikes: lokale PDFs, Ersatzteile, Reparaturhilfen und nachvollziehbare Quellen.',
    },
    '/hilfe': {
      title: 'Reparaturhilfe — Black Tea Motorbikes – Hilfe',
      description: 'Redaktionell geordnete Reparaturhilfen für typische Bonfire- und Wildfire-Fehlerbilder — mit Kurzablauf, ausführlicher Prüfung, Sicherheit und Quelle.',
    },
    [repairRequestPath]: {
      title: 'Reparatur anfragen — Black Tea Motorbikes – Hilfe',
      description: 'Reparaturanfragen zu Black Tea Bonfire und Wildfire stellen, Erfahrungen teilen und gemeinsam nachvollziehbare Lösungen dokumentieren.',
    },
    '/ersatzteile': {
      title: 'Ersatzteile — Black Tea Motorbikes – Hilfe',
      description: 'Historischer BTM-Ersatzteilkatalog mit Modellbezug, Teilenamen und Quellen. Bestand und Preise vor dem Kauf prüfen.',
    },
    '/community': {
      title: 'BTM Community-Wissen — Black Tea Motorbikes – Hilfe',
      description: 'Technische Hinweise aus der Black Tea Community verständlich zusammengefasst, mit lokalen PDFs und Originalquellen.',
    },
    '/quellen': {
      title: 'Quellen — Black Tea Motorbikes – Hilfe',
      description: 'Nachvollziehbare Quellen zu Insolvenzstatus, Handbüchern, lokalen PDFs, Ersatzteilspuren und Community-Wissen.',
    },
    '/impressum': {
      title: 'Impressum — Black Tea Motorbikes – Hilfe',
      description: 'Anbieterinformationen und rechtliche Hinweise zu Black Tea Motorbikes – Hilfe.',
    },
    '/datenschutz': {
      title: 'Datenschutz — Black Tea Motorbikes – Hilfe',
      description: 'Datenschutzhinweise zu Kommentaren, Bildanhängen und dem Betrieb von Black Tea Motorbikes – Hilfe.',
    },
    '/wiki': {
      title: 'Wiki — Black Tea Hilfe',
      description: 'Technische Grundlagen, Handbuchdaten und nachvollziehbare Hinweise zu den Black Tea Bikes Bonfire und Wildfire.',
    },
  };
  const page = metadata[path];
  if (!page) {
    return {
      title: 'Seite nicht gefunden — Black Tea Motorbikes – Hilfe',
      description: 'Die angeforderte Seite wurde nicht gefunden.',
      canonicalPath: path,
      robots: 'noindex,nofollow,noarchive',
      jsonLd: {},
    };
  }
  const collectionItems = path === '/hilfe'
    ? repairGuides.map((item) => ({ name: item.title, url: `${siteOrigin}${item.path}` }))
    : path === '/ersatzteile'
      ? historicalShopParts.map((item) => ({ name: item.title, url: `${siteOrigin}${item.path}` }))
      : path === '/community'
        ? communityKnowledge.map((item) => ({ name: item.title, url: `${siteOrigin}/community#${slugify(item.title)}` }))
        : [];
  const jsonLd = collectionItems.length ? {
    '@context': 'https://schema.org',
    '@graph': [
      websiteSchema,
      {
        '@type': 'CollectionPage',
        name: page.title,
        description: page.description,
        url: `${siteOrigin}${path === '/' ? '/' : path}`,
        inLanguage: 'de-DE',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: path === '/ersatzteile' ? historicalShopParts.length : collectionItems.length,
          itemListElement: collectionItems.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: item.url })),
        },
      },
    ],
  } : { '@context': 'https://schema.org', ...websiteSchema };

  return {
    ...page,
    canonicalPath: path === '/' ? '/' : path,
    robots: 'index,follow,max-image-preview:large',
    jsonLd,
  };
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function applySeoMetadata(metadata: SeoMetadata): void {
  document.title = metadata.title;
  upsertMeta('name', 'description', metadata.description);
  upsertMeta('name', 'robots', metadata.robots);
  upsertMeta('property', 'og:title', metadata.title);
  upsertMeta('property', 'og:description', metadata.description);
  upsertMeta('property', 'og:url', `${siteOrigin}${metadata.canonicalPath === '/' ? '/' : metadata.canonicalPath}`);
  upsertMeta('property', 'og:image', `${siteOrigin}/images/bonfire-konzept-skizze.png`);
  upsertMeta('property', 'og:image:alt', 'Designer-Konzeptskizze einer Black Tea Bonfire');
  upsertMeta('name', 'twitter:title', metadata.title);
  upsertMeta('name', 'twitter:description', metadata.description);
  upsertMeta('name', 'twitter:image', `${siteOrigin}/images/bonfire-konzept-skizze.png`);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${siteOrigin}${metadata.canonicalPath === '/' ? '/' : metadata.canonicalPath}`;

  let structuredData = document.head.querySelector<HTMLScriptElement>('#site-jsonld');
  if (typeof metadata.jsonLd['@context'] !== 'string' || metadata.jsonLd['@context'].trim() === '') {
    structuredData?.remove();
    return;
  }
  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'site-jsonld';
    structuredData.type = 'application/ld+json';
    document.head.appendChild(structuredData);
  }
  structuredData.textContent = JSON.stringify(metadata.jsonLd);
}

function AppContent({ initialPath }: { initialPath?: string } = {}) {
  const [locationKey, setLocationKey] = useState(() => initialPath ?? getLocationKey());

  useEffect(() => {
    const handleLocationChange = () => setLocationKey(getLocationKey());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const [path, hash = ''] = locationKey.split('#');
  const guide = repairGuides.find((candidate) => candidate.path === path || (path === '/' && hash === candidate.id));
  const part = historicalShopParts.find((candidate) => candidate.path === path);
  const bike = bikeProfiles.find((candidate) => candidate.path === path);
  const wikiArticle = wikiArticles.find((candidate) => candidate.path === path);
  const repairRequestId = getRepairRequestId(path);
  const seoMetadata = getSeoMetadata(path, guide, part, bike, wikiArticle);
  const isKnownPath = path === '/'
    || path === '/admin'
    || path === '/login'
    || path === '/registrieren'
    || path === '/konto'
    || path === '/passwort-zuruecksetzen'
    || path === '/hilfe'
    || path === repairRequestPath
    || Boolean(repairRequestId)
    || path === '/ersatzteile'
    || path === '/community'
    || path === '/quellen'
    || path === '/impressum'
    || path === '/datenschutz'
    || path === '/wiki'
    || Boolean(guide)
    || Boolean(part)
    || Boolean(bike)
    || Boolean(wikiArticle);

  useEffect(() => {
    applySeoMetadata(seoMetadata);
  }, [seoMetadata.canonicalPath, seoMetadata.description, seoMetadata.robots, seoMetadata.title, guide?.id, part?.id]);

  if (guide) return <RepairGuidePage guide={guide} />;
  if (path === '/admin') return <AdminPage />;
  if (path === '/login') return <LoginPage />;
  if (path === '/registrieren') return <RegisterPage />;
  if (path === '/passwort-zuruecksetzen') return <PasswordResetPage />;
  if (path === '/konto') return <AccountPage />;
  if (repairRequestId) return <RepairRequestDetailPage requestId={repairRequestId} />;
  if (path === repairRequestPath) return <RepairRequestPage />;
  if (path === '/hilfe') return <RepairGuideIndexPage />;
  if (part) return <PartDetailPage part={part} />;
  if (path === '/ersatzteile' || (path === '/' && hash === 'teile')) return <PartsPage />;
  if (path === '/community') return <CommunityPage />;
  if (path === '/quellen' || (path === '/' && hash === 'quellen')) return <SourcesPage />;
  if (path === '/impressum' || (path === '/' && hash === 'impressum')) return <LegalPage kind="impressum" />;
  if (path === '/datenschutz' || (path === '/' && hash === 'datenschutz')) return <LegalPage kind="datenschutz" />;
  if (bike) return <BikePage bike={bike} article={wikiArticle} />;
  if (wikiArticle) return <WikiArticlePage article={wikiArticle} />;
  if (path === '/wiki') return <WikiPage />;
  if (!isKnownPath) return <NotFoundPage path={path} />;
  return <HomePage />;
}

function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      document.documentElement.dataset.optionalServices = choice === 'accepted' ? 'allowed' : 'blocked';
      setVisible(!choice);
    } catch {
      // Do not interrupt the page when local storage is unavailable.
      document.documentElement.dataset.optionalServices = 'blocked';
    }
  }, []);

  if (!visible) return null;

  const choose = (choice: 'accepted' | 'rejected') => {
    setOptionalServiceConsent(choice);
    setVisible(false);
  };

  return (
    <section className="cookie-consent-banner card-doodle" role="dialog" aria-live="polite" aria-label="Cookie-Einstellungen">
      <div>
        <div className="eyebrow handwritten">kurz und transparent</div>
        <h2>Deine Cookie-Wahl.</h2>
        <p>Aktuell laden wir keine Analyse-, Werbe- oder eingebetteten Drittanbieter-Dienste. Technisch notwendige Sitzungsfunktionen bleiben aktiv. Wenn später optionale Inhalte dazukommen, laden wir sie nur nach deiner Zustimmung.</p>
        <a href="/datenschutz">Mehr zum Datenschutz ↗</a>
      </div>
      <div className="cookie-consent-actions">
        <button className="button button-ghost" type="button" onClick={() => choose('rejected')}>Ablehnen</button>
        <button className="button button-ink" type="button" onClick={() => choose('accepted')}>Optionale Inhalte erlauben</button>
      </div>
    </section>
  );
}

export function App(props: { initialPath?: string } = {}) {
  return <AuthProvider><AppContent {...props} /><CookieConsentBanner /></AuthProvider>;
}

function NotFoundPage({ path }: { path: string }) {
  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="not-found-page section-pad">
        <div className="eyebrow handwritten">404 · nicht gefunden</div>
        <h1>Diese Seite gibt es nicht.</h1>
        <p>Der Pfad <code>{path}</code> gehört nicht zu den veröffentlichten Inhalten von Black Tea Motorbikes – Hilfe.</p>
        <a className="resource-link" href="/">Zur Startseite ↗</a>
      </main>
      <GuideFooter />
    </div>
  );
}

function AvatarBadge({ user, compact = false }: { user: Pick<AuthUser, 'name' | 'avatarStyle' | 'avatarUrl'>; compact?: boolean }) {
  const style = Math.max(0, Math.min(19, user.avatarStyle));
  return (
    <span className={`avatar-badge avatar-style-${style} ${compact ? 'avatar-badge-compact' : ''}`} aria-label={`Avatar von ${user.name}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="avatar-fallback" aria-hidden="true">BTM</span>}
    </span>
  );
}

function PublicCommentAvatar({ comment }: { comment: Pick<PublicComment, 'name' | 'avatarStyle' | 'avatarUrl'> }) {
  if (!comment.avatarUrl) return null;
  const style = Math.max(0, Math.min(19, comment.avatarStyle ?? 0));
  return (
    <span className={`public-comment-avatar avatar-style-${style}`} aria-label={`Avatar von ${comment.name}`}>
      <img src={comment.avatarUrl} alt="" loading="lazy" />
    </span>
  );
}

function PublicCommentAuthor({ comment }: { comment: Pick<PublicComment, 'name' | 'avatarStyle' | 'avatarUrl'> }) {
  return (
    <span className="approved-comment-author">
      <PublicCommentAvatar comment={comment} />
      <strong>{comment.name}</strong>
    </span>
  );
}

function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Einloggen — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  if (user) {
    return (
      <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><div className="auth-card card-doodle"><div className="eyebrow handwritten">schön, dass du da bist</div><h1>Du bist schon drin.</h1><p>Dein persönlicher BTM-Hilfe-Bereich wartet auf dich.</p><a className="button button-ink" href="/konto">Zum Mein-Bereich ↗</a></div></main><GuideFooter /></div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      window.location.href = '/konto';
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Der Login konnte nicht durchgeführt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetSubmitting(true);
    setResetError('');
    setResetNotice('');
    try {
      const response = await apiJson<{ message: string }>('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetNotice(response.message);
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : 'Die Passwort-Mail konnte gerade nicht angefordert werden.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const openPasswordReset = () => {
    setResetEmail(email);
    setResetError('');
    setResetNotice('');
    setShowPasswordReset(true);
  };

  return (
    <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><section className="auth-card card-doodle"><div className="eyebrow handwritten">dein btm-bereich</div><h1>Einloggen.</h1><p>Mit deinem Konto kannst du kommentieren, Bugs melden und später sehen, wenn jemand auf deine Reparaturanfrage antwortet.</p><form className="auth-form" onSubmit={handleSubmit}><label>E-Mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label><label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{error && <p className="form-message form-message-error" role="alert">{error}</p>}<button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Einen Moment …' : 'Einloggen'} <span aria-hidden="true">↗</span></button></form><p className="auth-switch"><button className="auth-text-button" type="button" onClick={openPasswordReset} aria-expanded={showPasswordReset}>Passwort vergessen?</button></p>{showPasswordReset && <section className="auth-reset-request"><div className="eyebrow handwritten">wieder reinkommen</div><h2>Passwort zurücksetzen.</h2><p>Gib deine E-Mail-Adresse ein. Wenn sie zu einem aktiven Konto gehört, schicken wir dir einen sicheren Link.</p><form className="auth-form" onSubmit={handlePasswordResetRequest}><label>E-Mail<input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} type="email" autoComplete="email" required /></label>{resetError && <p className="form-message form-message-error" role="alert">{resetError}</p>}{resetNotice && <p className="form-message form-message-success" role="status">{resetNotice}</p>}<button className="button button-ghost" type="submit" disabled={resetSubmitting}>{resetSubmitting ? 'Mail wird angefordert …' : 'Reset-Mail anfordern'} <span aria-hidden="true">↗</span></button></form></section>}<p className="auth-switch">Noch kein Konto? <a href="/registrieren">Jetzt registrieren ↗</a></p></section></main><GuideFooter /></div>
  );
}

function PasswordResetPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    document.title = 'Passwort zurücksetzen — Black Tea Motorbikes – Hilfe';
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await apiJson<{ message: string }>('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      setNotice(response.message);
      setPassword('');
      setPasswordConfirm('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Das Passwort konnte nicht geändert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><section className="auth-card card-doodle"><div className="eyebrow handwritten">neuer zugang</div><h1>Passwort zurücksetzen.</h1>{token ? <><p>Lege ein neues Passwort für dein BTM-Hilfe-Konto fest.</p><form className="auth-form" onSubmit={handleSubmit}><label>Neues Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required /><small>Mindestens 10 Zeichen.</small></label><label>Passwort wiederholen<input value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label>{error && <p className="form-message form-message-error" role="alert">{error}</p>}{notice && <p className="form-message form-message-success" role="status">{notice}</p>}<button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird gespeichert …' : 'Neues Passwort speichern'} <span aria-hidden="true">↗</span></button></form>{notice && <p className="auth-switch"><a href="/login">Zum Login ↗</a></p>}</> : <><p>Dieser Link enthält keinen gültigen Passwort-Token. Bitte fordere im Admin-Bereich eine neue Reset-Mail an.</p><a className="button button-ink" href="/login">Zum Login ↗</a></>}</section></main><GuideFooter /></div>
  );
}

function RegisterPage() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Registrieren — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  if (user) {
    return <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><div className="auth-card card-doodle"><div className="eyebrow handwritten">konto vorhanden</div><h1>Du bist bereits registriert.</h1><p>Verwalte deine Bike-Einstellungen direkt in deinem persönlichen Bereich.</p><a className="button button-ink" href="/konto">Zum Mein-Bereich ↗</a></div></main><GuideFooter /></div>;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const message = await register(name, email, password, passwordConfirm);
      setNotice(message);
      setPassword('');
      setPasswordConfirm('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Registrierung konnte nicht durchgeführt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><section className="auth-card card-doodle"><div className="eyebrow handwritten">dabei sein, mithelfen</div><h1>Registrieren.</h1><p>Ein kleines Konto reicht. Wir bestätigen deine E-Mail zuerst über Mailjet – erst danach ist dein Zugang aktiv.</p><section className="auth-benefits" aria-labelledby="register-benefits-title"><div className="eyebrow handwritten">warum ein konto?</div><h2 id="register-benefits-title">Einmal bestätigen. Später Zeit sparen.</h2><p>Deine E-Mail wird nur einmal bestätigt. Danach werden Name und Mail bei deinen Beiträgen automatisch aus deinem Konto übernommen.</p><ul><li>Eigene Reparaturanfragen und Antworten wiederfinden</li><li>Benachrichtigungen erhalten, wenn jemand auf deine Sachen antwortet</li><li>Bike-Modell, Kilometerstand und Avatar im persönlichen Bereich speichern</li></ul><p className="auth-benefits-note">Kostenlos – ohne Abo und ohne versteckte Kosten. In Zukunft kommt noch mehr dazu.</p></section><form className="auth-form" onSubmit={handleSubmit}><label>Name<input value={name} onChange={(event) => setName(normaliseDisplayName(event.target.value))} minLength={2} maxLength={80} autoComplete="name" autoCapitalize="none" autoCorrect="off" spellCheck={false} pattern="[a-z0-9äöüß]+" title="Nur Kleinbuchstaben und Zahlen, ohne Leerzeichen, Sonderzeichen oder Emojis." required /><small>Nur Kleinbuchstaben und Zahlen, ohne Leerzeichen oder Emojis.</small></label><label>E-Mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={180} autoComplete="email" required /></label><label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required /><small>Mindestens 10 Zeichen.</small></label><label>Passwort wiederholen<input value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required /></label>{error && <p className="form-message form-message-error" role="alert">{error}</p>}{notice && <p className="form-message form-message-success" role="status">{notice}</p>}<button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Konto wird angelegt …' : 'Registrieren'} <span aria-hidden="true">↗</span></button></form><p className="auth-switch">Schon dabei? <a href="/login">Zum Login ↗</a></p></section></main><GuideFooter /></div>
  );
}

function AccountPage() {
  const { user, loading, csrfToken, updateProfile, uploadAvatar, markNotificationRead, logout } = useAuth();
  const [name, setName] = useState('');
  const [model, setModel] = useState<'Bonfire' | 'Wildfire' | ''>('');
  const [kilometers, setKilometers] = useState(0);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountSection, setAccountSection] = useState<'overview' | 'moderation' | 'chat'>('overview');

  useEffect(() => {
    document.title = 'Mein Bereich — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(normaliseDisplayName(user.name));
    setModel(user.model ?? '');
    setKilometers(user.kilometers);
    setNotifyReplies(user.notifyReplies);
    setNewsletterSubscribed(user.newsletterSubscribed);
  }, [user]);

  if (loading) return <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><div className="auth-card card-doodle"><div className="eyebrow handwritten">dein btm-bereich</div><h1>Konto wird geladen …</h1><p>Einen Moment bitte.</p></div></main><GuideFooter /></div>;
  if (!user) return <div className="site-shell"><GuideHeader /><main className="auth-page section-pad"><div className="auth-card card-doodle"><div className="eyebrow handwritten">zugang nötig</div><h1>Dein Bereich wartet.</h1><p>Logge dich ein, um deine Einstellungen, Benachrichtigungen und Avatar-Spielerei zu sehen.</p><a className="button button-ink" href="/login">Einloggen ↗</a><a className="auth-secondary-link" href="/registrieren">Noch kein Konto? Registrieren</a></div></main><GuideFooter /></div>;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateProfile({ name, model: model || null, kilometers: Number(kilometers), notifyReplies, newsletterSubscribed });
      setNotice('Gespeichert. Dein BTM-Bereich ist auf dem aktuellen Stand.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Einstellungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Bitte ein Bild bis höchstens 2 MB auswählen.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      await uploadAvatar(file);
      setNotice('Dein Bild ist jetzt als Avatar gespeichert.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Das Bild konnte nicht gespeichert werden.');
    } finally {
      setUploading(false);
    }
  };

  const unread = user.notifications.filter((notification) => !notification.readAt);
  const previewUser = user;
  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="account-page section-pad">
        <section className="account-hero">
          <div>
            <div className="eyebrow handwritten">dein persönlicher bereich</div>
            <h1>Hallo, {user.name}.</h1>
            <p>Ein bisschen Bike-Profil, ein bisschen Community. Name und E-Mail werden bei deinen Beiträgen automatisch aus deinem bestätigten Konto übernommen.</p>
          </div>
          <div className="account-hero-avatar"><AvatarBadge user={previewUser} /></div>
        </section>
        {user.role === 'moderator' && (
            <div className="account-section-tabs" role="tablist" aria-label="Bereiche im Mein-Bereich">
            <button className={accountSection === 'overview' ? 'active' : ''} type="button" role="tab" aria-selected={accountSection === 'overview'} onClick={() => setAccountSection('overview')}>Mein Bereich</button>
            <button className={accountSection === 'moderation' ? 'active' : ''} type="button" role="tab" aria-selected={accountSection === 'moderation'} onClick={() => setAccountSection('moderation')}>Moderation</button>
            <button className={accountSection === 'chat' ? 'active' : ''} type="button" role="tab" aria-selected={accountSection === 'chat'} onClick={() => setAccountSection('chat')}>Team-Chat</button>
          </div>
        )}
        {accountSection === 'moderation' && user.role === 'moderator' ? <ModeratorDashboardPanel csrfToken={csrfToken} /> : accountSection === 'chat' && user.role === 'moderator' ? <StaffChatPanel csrfToken={csrfToken} context="moderator" /> : <div className="account-grid">
          <section className="account-card card-doodle">
            <div className="eyebrow handwritten">bike &amp; spielerei</div>
            <h2>Deine Einstellungen</h2>
            <form className="auth-form" onSubmit={saveProfile}>
              <label>Anzeigename<input value={name} onChange={(event) => setName(normaliseDisplayName(event.target.value))} minLength={2} maxLength={80} autoCapitalize="none" autoCorrect="off" spellCheck={false} pattern="[a-z0-9äöüß]+" title="Nur Kleinbuchstaben und Zahlen, ohne Leerzeichen, Sonderzeichen oder Emojis." required /><small>Nur Kleinbuchstaben und Zahlen, ohne Leerzeichen oder Emojis.</small></label>
              <label>Dein Modell<select value={model} onChange={(event) => setModel(event.target.value as 'Bonfire' | 'Wildfire' | '')}><option value="">Noch nicht festgelegt</option><option value="Bonfire">Bonfire</option><option value="Wildfire">Wildfire</option></select></label>
              <label>Kilometerstand<input value={kilometers} onChange={(event) => setKilometers(Number(event.target.value))} type="number" min="0" max="999999" step="1" /><small>Nur für deinen persönlichen Bereich – keine öffentliche Statistik.</small></label>
              <label className="account-check"><input checked={notifyReplies} onChange={(event) => setNotifyReplies(event.target.checked)} type="checkbox" /> Benachrichtigungen bei Antworten aktivieren</label>
              <div className="account-consent-setting"><label className="account-check"><input checked={newsletterSubscribed} onChange={(event) => setNewsletterSubscribed(event.target.checked)} type="checkbox" /> Newsletter erhalten</label><small>Neuigkeiten und wichtige Updates per E-Mail. Du kannst ihn hier jederzeit abbestellen.</small></div>
              <div className="avatar-upload"><label>Eigenes Bild (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={uploading} /><small>{uploading ? 'Bild wird gespeichert …' : 'JPG, PNG oder WEBP · maximal 2 MB. Dein eigenes Bild ersetzt den zugewiesenen Avatar.'}</small></label></div>
              {error && <p className="form-message form-message-error" role="alert">{error}</p>}
              {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
              <button className="button button-ink" type="submit" disabled={saving}>{saving ? 'Wird gespeichert …' : 'Einstellungen speichern'} <span aria-hidden="true">↗</span></button>
            </form>
          </section>
          <section className="account-card card-doodle">
            <div className="eyebrow handwritten">postfach</div>
            <h2>Antworten für dich{unread.length ? ` · ${unread.length} neu` : ''}</h2>
            <p className="account-notification-intro">Wenn jemand auf deine freigegebene Reparaturanfrage antwortet, findest du hier den Hinweis – und optional zusätzlich in deinem E-Mail-Postfach.</p>
            <div className="account-notifications">{user.notifications.length ? user.notifications.map((notification) => <article className={`account-notification ${notification.readAt ? 'is-read' : 'is-unread'}`} key={notification.id}><div><strong>{notification.title}</strong><p>{notification.body}</p><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleDateString('de-DE')}</time></div><div className="account-notification-actions"><a href={notification.href}>Öffnen ↗</a>{!notification.readAt && <button type="button" onClick={() => { void markNotificationRead(notification.id); }}>Als gelesen markieren</button>}</div></article>) : <p className="no-comments">Noch keine Antworten. Wir sagen dir Bescheid, sobald es etwas Neues gibt.</p>}</div>
            <button className="account-logout-button" type="button" onClick={() => { void logout().then(() => { window.location.href = '/'; }); }}>Ausloggen</button>
          </section>
        </div>}
      </main>
      <GuideFooter />
    </div>
  );
}

function ModeratorDashboardPanel({ csrfToken }: { csrfToken: string }) {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOpenComments = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiJson<{ comments: AdminComment[] }>('/api/admin/comments');
      setComments(payload.comments.filter((comment) => comment.status === 'pending'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Offene Beiträge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOpenComments();
  }, []);

  const updateComment = async (comment: AdminComment, status: 'approved' | 'pending') => {
    setBusyId(comment.id);
    setError('');
    setNotice('');
    try {
      await apiJson<{ comment: AdminComment }>(`/api/admin/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ status }),
      });
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setNotice(status === 'approved' ? 'Beitrag freigegeben.' : 'Beitrag zurückgestellt.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Der Beitrag konnte nicht aktualisiert werden.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteComment = async (comment: AdminComment) => {
    if (!window.confirm(`Beitrag von ${comment.name} wirklich löschen?`)) return;
    setBusyId(comment.id);
    setError('');
    setNotice('');
    try {
      await apiJson<{ deleted: boolean }>(`/api/admin/comments/${comment.id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setNotice('Beitrag gelöscht.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Der Beitrag konnte nicht gelöscht werden.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="account-moderation-panel account-card card-doodle">
      <div className="account-moderation-heading">
        <div>
          <div className="eyebrow handwritten">moderation · intern</div>
          <h2>Offene Beiträge.</h2>
          <p>Hier siehst du nur Inhalte, die noch auf eine redaktionelle Prüfung warten.</p>
        </div>
        <button className="button button-ghost" type="button" onClick={() => { void loadOpenComments(); }} disabled={loading}>Aktualisieren ↻</button>
      </div>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
      <div className="account-moderation-count">{loading ? 'Offene Beiträge werden geladen …' : `${comments.length} offen`}</div>
      <div className="account-moderation-list">
        {loading ? <p className="no-comments">Einen Moment bitte.</p> : comments.length ? comments.map((comment) => (
          <article className="account-moderation-item card-doodle" key={comment.id}>
            <div className="account-moderation-item-topline">
              <span className="admin-status pending">wartet auf Prüfung</span>
              <span className="admin-kind">{comment.kind === 'wiki_suggestion' ? 'Wiki-Vorschlag' : comment.kind === 'repair_request' ? 'Reparaturanfrage' : comment.kind === 'repair_answer' ? 'Antwort auf Reparaturanfrage' : 'Erfahrungsbericht'}</span>
            </div>
            <h3>{comment.topic ?? comment.name}</h3>
            <p className="account-moderation-meta">{comment.topic ? `${comment.name} · ` : ''}{comment.guide} · {new Date(comment.createdAt).toLocaleString('de-DE')}</p>
            {comment.section && <p className="admin-comment-target"><strong>Modell / Bereich:</strong> „{comment.section}“</p>}
            <p className="account-moderation-body">{comment.body}</p>
            {comment.source && <p className="admin-comment-source"><strong>Quelle:</strong> {comment.source}</p>}
            {comment.imageUrl && <a href={comment.imageUrl} target="_blank" rel="noreferrer"><img className="admin-comment-image" src={comment.imageUrl} alt={`Anhang von ${comment.name}`} /></a>}
            <div className="account-moderation-actions">
              <button className="button button-ink" type="button" disabled={busyId !== null} onClick={() => void updateComment(comment, 'approved')}>Freigeben</button>
              <button className="button button-danger" type="button" disabled={busyId !== null} onClick={() => void deleteComment(comment)}>Löschen</button>
            </div>
          </article>
        )) : <div className="admin-empty card-doodle"><h3>Alles ruhig.</h3><p>Aktuell liegt nichts zur Prüfung vor.</p></div>}
      </div>
    </section>
  );
}

function StaffChatPanel({ csrfToken, context }: { csrfToken: string; context: 'admin' | 'moderator' }) {
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiJson<{ messages: StaffChatMessage[] }>('/api/admin/chat', {
        headers: { 'X-Staff-Context': context },
      });
      setMessages(payload.messages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Der Team-Chat konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = await apiJson<{ message: StaffChatMessage }>('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, 'X-Staff-Context': context },
        body: JSON.stringify({ body: trimmedBody }),
      });
      setMessages((current) => [...current, payload.message]);
      setBody('');
      setNotice('Nachricht gesendet.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Die Nachricht konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="staff-chat-panel account-card card-doodle">
      <div className="staff-chat-heading">
        <div>
          <div className="eyebrow handwritten">intern · nur team</div>
          <h2>Team-Chat.</h2>
          <p>Gemeinsamer Austausch für Admins und Moderatoren. Nachrichten werden automatisch nach 20 Tagen gelöscht.</p>
        </div>
        <button className="button button-ghost" type="button" onClick={() => { void loadMessages(); }} disabled={loading}>Aktualisieren ↻</button>
      </div>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
      <div className="staff-chat-messages" aria-live="polite">
        {loading ? <p className="no-comments">Chat wird geladen …</p> : messages.length ? messages.map((message) => (
          <article className="staff-chat-message" key={message.id}>
            <div className="staff-chat-message-topline"><strong>{message.authorName}</strong><span>{message.authorRole === 'admin' ? 'Admin' : 'Moderator'}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('de-DE')}</time></div>
            <p>{message.body}</p>
          </article>
        )) : <p className="no-comments">Noch keine Nachrichten im Team-Chat.</p>}
      </div>
      <form className="staff-chat-form comment-form" onSubmit={handleSubmit}>
        <label>Nachricht<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={4} placeholder="Was sollten Admins und Moderatoren wissen?" required /></label>
        <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird gesendet …' : 'Nachricht senden'} <span aria-hidden="true">↗</span></button>
      </form>
    </section>
  );
}

function HomePage() {
  const [filter, setFilter] = useState<Filter>('Alle');
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Black Tea Motorbikes – Hilfe — Dokumente, Ersatzteile & Updates';
  }, []);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesFilter = filter === 'Alle' || resource.kind === filter;
      const searchable = `${resource.title} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, query]);

  const featuredSourcingCards = useMemo(() => {
    return sourcingCards
      .filter((card) => Boolean(card.amazon?.href || card.fallback?.href))
      .slice(0, 4);
  }, []);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Black Tea Motorbikes – Hilfe Startseite">
          <span className="wordmark-mark" aria-hidden="true">BTM</span>
          <span>black tea motorbikes – <strong>hilfe</strong></span>
        </a>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="#status">Status</a>
          <a href="#wissen">PDFs</a>
          <RepairMenu />
          <a href="/ersatzteile">Ersatzteile</a>
          <BikeMenu />
          <a href="/quellen">Quellen</a>
        </nav>
        <AccountMenu />
      </header>
      <BugReportWidget />

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <div className="eyebrow handwritten">eine unabhängige sammelstelle</div>
            <h1>Damit gute Bikes<br /><span className="scribble-underline">weiterfahren.</span></h1>
            <p className="hero-lede">Dokumente, Ersatzteile und verlässliche Hinweise für die Black Tea Community — gesammelt an einem Ort, solange sich die offizielle Lage sortiert.</p>
            <div className="hero-actions">
              <a className="button button-ink" href="#wissen">Unterlagen finden <span aria-hidden="true">↓</span></a>
              <a className="button button-ghost" href="#status">Was ist passiert?</a>
            </div>
            <p className="micro-note handwritten">↳ zuletzt geprüft: 02.09.2026</p>
          </div>

          <div className="hero-doodle">
            <picture className="hero-concept-picture">
              <source
                srcSet="/images/bonfire-konzept-skizze-480.webp 480w, /images/bonfire-konzept-skizze-768.webp 768w, /images/bonfire-konzept-skizze.webp 1536w"
                sizes="(max-width: 620px) calc(100vw - 84px), (max-width: 900px) 90vw, 48vw"
                type="image/webp"
              />
              <img className="hero-concept-image" src="/images/bonfire-konzept-skizze.webp" width="1536" height="1024" alt="Designer-Konzeptskizze einer Black Tea Bonfire" loading="eager" decoding="async" {...({ fetchpriority: 'high' } as Record<string, string>)} />
            </picture>
          </div>
        </section>

        <section id="status" className="status-section section-pad">
          <div className="status-card card-doodle">
            <div className="status-topline">
              <span className="status-dot" />
              <span className="status-label">Stand der Dinge</span>
              <span className="status-date">02.09.2026</span>
            </div>
            <div className="status-grid">
              <div>
                <h2>Vorläufige Insolvenzverwaltung angeordnet.</h2>
                <p>Das Amtsgericht München hat am 14.07.2026 Sicherungsmaßnahmen im Verfahren gegen die Black Tea Motorbikes GmbH angeordnet. Das ist ein laufender Verfahrensstand — keine Aussage darüber, welche Fahrzeuge, Teile oder Services am Ende verfügbar bleiben.</p>
              </div>
              <dl className="fact-list">
                <div><dt>Gericht</dt><dd>Amtsgericht München</dd></div>
                <div><dt>Aktenzeichen</dt><dd>1513 IN 2588/26</dd></div>
                <div><dt>Verwalter</dt><dd>Florian Loserth</dd></div>
                <div><dt>Adresse</dt><dd>Herzogstraße 9 · 80803 München</dd></div>
              </dl>
            </div>
            <div className="status-footer">
              <span>⚠ Verfügbarkeit, Garantie und Forderungen bitte nicht aus dieser Seite ableiten.</span>
              <a href="#chronik">Zeitliche Einordnung ↓</a>
              <a href={sourceLinks[0].href} target="_blank" rel="nofollow noreferrer">Verfahrensquelle öffnen ↗</a>
            </div>
          </div>
        </section>

        <section id="chronik" className="timeline-section timeline-section-featured section-pad">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow handwritten">chronik · aktuell eingeordnet</div>
              <h2>Was bisher bekannt ist</h2>
            </div>
            <div className="timeline-highlight">
              <strong>4 Stationen</strong>
              <span>Die wichtigsten öffentlich dokumentierten Schritte zum Verfahren.</span>
            </div>
          </div>
          <div className="timeline">
            <TimelineItem date="14.07.2026" title="Sicherungsmaßnahmen angeordnet" text="Das Amtsgericht München ordnet vorläufige Insolvenzverwaltung an. Aktenzeichen: 1513 IN 2588/26." sourceHref={sourceLinks[0].href} sourceLabel="Verfahrensquelle" />
            <TimelineItem date="16.07.2026" title="Erste öffentliche Berichte" text="Die ersten Berichte ordnen die Situation ein. Welche Folgen das für Bestellungen, Reparaturen und Ersatzteile hat, war zu diesem Zeitpunkt noch offen." sourceHref={sourceLinks[0].href} sourceLabel="Verfahrensquelle" />
            <TimelineItem date="01.09.2026" title="Verfahrensstand erneut veröffentlicht" text="Der laufende Verfahrensstand ist erneut öffentlich dokumentiert. Für verbindliche rechtliche Fragen ist die zuständige Stelle maßgeblich." sourceHref={sourceLinks[0].href} sourceLabel="Verfahrensquelle" />
            <TimelineItem date="02.09.2026" title="MOTORRAD Online ordnet Folgen ein" text="MOTORRAD Online beschreibt die 2026er Bonfire und Wildfire und weist auf das vorläufige Insolvenzverfahren hin. Liefertermine, Verfügbarkeit, Gewährleistung/Service und Ersatzteilversorgung sind dadurch schwerer verlässlich einzuschätzen." sourceHref={sourceLinks[1].href} sourceLabel="MOTORRAD Online" />
          </div>
        </section>

        <section id="wissen" className="library-section section-pad">
          <div className="section-heading">
            <div>
              <div className="eyebrow handwritten">wissen, das nicht verschwinden soll</div>
              <h2>Die Sammelmappe</h2>
            </div>
            <div className="section-arrow handwritten">sortieren, suchen,<br />weitergeben →</div>
          </div>

          <div className="toolbar card-doodle">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Dokumente und Teile durchsuchen</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Batterie, Wildfire, Schaltplan …" />
            </label>
            <div className="filter-tabs" role="group" aria-label="Inhalte filtern">
              {(['Alle', 'Dokument', 'Ersatzteil', 'Community'] as Filter[]).map((item) => (
                <button key={item} className={filter === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter(item)} type="button">
                  {item === 'Alle' ? 'Alles' : item === 'Dokument' ? 'PDFs & Wissen' : item === 'Ersatzteil' ? 'Ersatzteile' : 'Community'}
                </button>
              ))}
            </div>
          </div>

          <div className="resource-grid">
            {filteredResources.map((resource, index) => <ResourceCard key={`${resource.kind}-${resource.title}`} resource={resource} index={index} />)}
          </div>
          {filteredResources.length === 0 && <div className="empty-state card-doodle">Nichts gefunden. Versuch es mit „Bonfire“, „Wildfire“ oder „Akku“.</div>}
          <p className="content-note handwritten">Alle Links führen zur Originalquelle oder zu einer klar gekennzeichneten Spiegelung. Bestand und Preise können sich ändern.</p>
        </section>

        <section id="teile" className="parts-section section-pad">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow handwritten">erst prüfen, dann schrauben</div>
              <h2>Ersatzteile</h2>
            </div>
            <a className="button button-ghost" href="/ersatzteile">Alle Ersatzteile ansehen ↗</a>
          </div>
          <p className="parts-section-lede">Im Ersatzteilkatalog findest du alle früheren BTM-Shop-Einträge. Kaufbare Treffer zeigen wir unten direkt mit Link; die vollständigen Archivdaten liegen auf der eigenen Ersatzteilseite.</p>
        </section>

        <section id="bezugsquellen" className="sourcing-section section-pad">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow handwritten">kauf-links · amazon zuerst</div>
              <h2>Gefundene Kaufoptionen</h2>
            </div>
            <a className="button button-ghost" href="/ersatzteile">Ersatzteilkatalog öffnen ↗</a>
          </div>
          <div className="sourcing-intro card-doodle">
            <span className="sourcing-badge">1. Amazon</span>
            <p>Hier erscheinen nur Produkte mit einem konkreten Kauf-Link. Die vier belegten Treffer bleiben stabil, damit Suchmaschinen und Menschen dieselben Inhalte sehen. Den Passformstatus findest du direkt am jeweiligen Artikel.</p>
            <strong>Alibaba bleibt draußen.</strong>
          </div>
          <div className="sourcing-grid">
            {featuredSourcingCards.map((card, index) => <SourcingCard key={card.title} card={card} index={index} />)}
          </div>
          <p className="content-note handwritten">Preise und Lagerbestand ändern sich. Vor dem Bestellen immer Teilenummer, Fotos und Fahrzeugvariante gegenprüfen.</p>
        </section>

        <div className="parts-callout card-doodle parts-callout-bottom section-pad">
          <div className="parts-icon" aria-hidden="true">⚙</div>
          <div>
            <h3>Historischer Ersatzteilkatalog</h3>
            <p>106 frühere BTM-Shop-Einträge sind lokal gesichert. Nicht jedes Teil ist heute verfügbar oder passt ohne weitere Prüfung. Wenn du einen passenden Artikel gefunden und erfolgreich eingebaut hast, teile ihn bitte direkt auf der jeweiligen Ersatzteilseite in den Kommentaren — die Community profitiert davon.</p>
          </div>
          <div className="parts-checklist">
            <span>□ Modell prüfen</span>
            <span>□ Maße prüfen</span>
            <span>□ Quelle öffnen</span>
          </div>
        </div>

      </main>

      <BugReportWidget />
      <footer className="site-footer">
        <span className="wordmark"><span className="wordmark-mark" aria-hidden="true">BTM</span>black tea motorbikes – <strong>hilfe</strong></span>
        <span className="handwritten">gebaut für die leute, die weiterfahren wollen.</span>
        <span className="footer-links"><a href={localPartArchiveHref}>Quellen &amp; Archivstand</a><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></span>
        <a href="#top">nach oben ↑</a>
      </footer>
    </div>
  );
}

function SourcesPage() {
  useEffect(() => {
    document.title = 'Quellen — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="repair-page-main sources-page-main">
        <section className="repair-page-hero sources-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">nachvollziehbar statt hörensagen</div>
          <h1>Quellen & Weiterleitung</h1>
          <p>Hier findest du die Ausgangspunkte für Status, technische Daten, lokale PDFs und Community-Wissen. Lokale Kopien bleiben direkt nutzbar; externe Seiten sind zum Gegenprüfen verlinkt.</p>
        </section>

        <section className="sources-section section-pad">
          <div id="ersatzteil-archiv" className="sources-card card-doodle">
            <div className="section-heading compact">
              <div>
                <div className="eyebrow handwritten">offen dokumentiert</div>
                <h2>Unsere Quellen</h2>
              </div>
              <span className="source-stamp">OPEN<br />NOTES</span>
            </div>
            <p className="sources-local-note"><strong>Ersatzteil-Archiv:</strong> Die historischen Shop-Daten werden auf dieser Website lokal aus unserem gesicherten Datensatz angezeigt. Externe Archivseiten sind dafür nicht erforderlich; sie dienen nur der internen Nachvollziehbarkeit der Recherche.</p>
            <SourceList />
            <p className="sources-disclaimer">Dieses Projekt ist unabhängig und keine Rechts-, Garantie- oder Reparaturberatung. Bitte sicherheitsrelevante Arbeiten nur durch qualifizierte Fachbetriebe durchführen lassen.</p>
          </div>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function SourceList() {
  return (
    <div className="source-list">
      {sourceLinks.map((source) => {
        const external = source.href.startsWith('http');
        return (
          <a className="source-row" key={source.title} href={source.href} target={external ? '_blank' : undefined} rel={external ? 'nofollow noreferrer' : undefined}>
            <span><strong>{source.title}</strong><small>{source.detail}</small></span>
            <span aria-hidden="true">↗</span>
          </a>
        );
      })}
    </div>
  );
}

function LegalPage({ kind }: { kind: 'impressum' | 'datenschutz' }) {
  const isPrivacy = kind === 'datenschutz';

  useEffect(() => {
    document.title = `${isPrivacy ? 'Datenschutz' : 'Impressum'} — Black Tea Motorbikes – Hilfe`;
    window.scrollTo(0, 0);
  }, [isPrivacy]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="legal-page-main">
        <section className="legal-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">rechtliches</div>
          <h1>{isPrivacy ? 'Datenschutz' : 'Impressum'}</h1>
          <p>{isPrivacy ? 'Wie Kommentare, Bildanhänge und technisch notwendige Zugriffsdaten bei Black Tea Motorbikes – Hilfe verarbeitet werden.' : 'Anbieterinformationen und rechtliche Hinweise zu dieser unabhängigen Sammelstelle.'}</p>
        </section>

        <section className="legal-page-section section-pad">
          <article className="legal-card legal-page-card card-doodle">
            <div className="eyebrow handwritten">{isPrivacy ? 'datenschutz' : 'anbieter'}</div>
            <h2>{isPrivacy ? 'Datenschutz' : 'Impressum'}</h2>
            {isPrivacy ? (
              <>
                <p className="legal-meta">Stand: 02.09.2026</p>
                <h3>Verantwortlicher</h3>
                <p>Alexander Komissarov<br />Teplitzer Str. 104<br />01219 Dresden<br />Deutschland<br /><a href="mailto:hallo@shortaktien.de">hallo@shortaktien.de</a></p>
                <h3>Besuch der Website</h3>
                <p>Diese Website stellt Dokumente und Hinweise bereit. Es gibt keine eingebauten Analyse- und Marketingdienste. Für moderierte Kommentare, Reparaturanfragen, Wiki-Ergänzungen, Benachrichtigungen und den optionalen Newsletter können Nutzer freiwillig ein Konto anlegen.</p>
                <h3>Optionale Dienste und Cookie-Wahl</h3>
                <p>Aktuell werden keine Analyse-, Werbe- oder Marketing-Cookies und keine eingebetteten Drittanbieter-Dienste geladen. Die Auswahl im Hinweisbanner wird nur lokal im Browser gespeichert. Technisch notwendige Sitzungsfunktionen für Anmeldung und Community bleiben davon unberührt. Bei „Ablehnen“ werden optionale Inhalte nicht nachgeladen; externe Seiten öffnen sich erst nach einem bewussten Klick auf einen externen Link.</p>
                <h3>Nutzerkonto, Kommentare und Bildanhänge</h3>
                <p>Bei der Registrierung werden Name, E-Mail-Adresse und ein Passwort-Hash gespeichert. Die E-Mail-Adresse wird über Mailjet bestätigt; erst danach wird das Konto aktiviert. Im persönlichen Bereich können freiwillig Modell, Kilometerstand, Avatarbild, Avatar-Stil, die Benachrichtigung bei Antworten und der Newsletter-Empfang gespeichert werden. Das Avatarbild bleibt zugriffsgeschützt und wird nicht öffentlich ausgestellt. Der Newsletter wird ausschließlich an bestätigte Nutzer mit aktivierter Einstellung über Mailjet versendet und kann im persönlichen Bereich jederzeit abbestellt werden.</p>
                <p>Wenn du eingeloggt einen Kommentar, eine Reparaturanfrage oder einen Wiki-Vorschlag abgibst, übernimmt die Website Name und E-Mail-Adresse aus deinem bestätigten Konto. Beitragstext, optional eine Quellenangabe und optional ein Bild werden intern zur redaktionellen Prüfung gespeichert. Erst nach Freigabe erscheint der Beitrag öffentlich; die E-Mail-Adresse bleibt intern. Anonyme Einsendungen erhalten weiterhin eine einzelne Bestätigungs-E-Mail über Mailjet, bevor sie bei uns zur Prüfung landen.</p>
                <p>Bei einer Bugmeldung werden Titel, Fundstellen-URL und Fehlerbeschreibung gespeichert. Eingeloggte Nutzer werden über ihr bestätigtes Konto zugeordnet; anonyme Meldungen werden zunächst per Mailjet bestätigt. Erst danach wird die Meldung als GitHub-Issue angelegt. Die E-Mail-Adresse wird nicht in das öffentliche Issue übernommen.</p>
                <p>Beim Aufruf können technisch notwendige Zugriffsdaten wie aufgerufene Seite, Datum und Uhrzeit, übertragene Datenmenge, Browser-/Betriebssysteminformationen, Referrer-URL und IP-Adresse in Server-Logs des Hostings verarbeitet werden. Das dient dem sicheren und stabilen Betrieb.</p>
                <h3>Externe Links und Rechte</h3>
                <p>Erst beim Anklicken eines externen Links, etwa zu Amazon, einem Fachhändler oder einem Forum, wird eine Verbindung zum jeweiligen Anbieter hergestellt. Es gelten dann dessen Datenschutzbestimmungen.</p>
                <p>Du hast im Rahmen der gesetzlichen Voraussetzungen insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Anfragen kannst du an die oben genannte E-Mail-Adresse richten. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.</p>
                <p className="legal-meta">Diese Hinweise orientieren sich an den Rechtstexten von <a href="https://shortaktien.de/impressum" target="_blank" rel="nofollow noreferrer">shortaktien.de</a> und wurden für diese Sammelstelle angepasst.</p>
              </>
            ) : (
              <>
                <h3>Anbieter und Verantwortlicher</h3>
                <p>Alexander Komissarov<br />Teplitzer Str. 104<br />01219 Dresden<br />Deutschland</p>
                <h3>Kontakt</h3>
                <p>E-Mail: <a href="mailto:hallo@shortaktien.de">hallo@shortaktien.de</a></p>
                <p>Black Tea Motorbikes – Hilfe ist eine unabhängige private Sammelstelle für Dokumente, Ersatzteilspuren und Community-Hinweise. Es besteht keine Verbindung zur Black Tea Motorbikes GmbH.</p>
                <h3>Haftung für Inhalte und Links</h3>
                <p>Die Inhalte werden mit Sorgfalt zusammengestellt. Für Richtigkeit, Vollständigkeit und Aktualität wird keine Gewähr übernommen. Für externe Seiten sind die jeweiligen Anbieter verantwortlich.</p>
              </>
            )}
            <div className="legal-page-links">
              <a className="text-link" href={isPrivacy ? '/impressum' : '/datenschutz'}>{isPrivacy ? 'Zum Impressum' : 'Zum Datenschutz'} ↗</a>
            </div>
          </article>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function ResourceCard({ resource, index }: { resource: Resource; index: number }) {
  return (
    <article className={`resource-card card-doodle ${index % 3 === 1 ? 'tilt-right' : index % 3 === 2 ? 'tilt-left' : ''}`}>
      <div className="resource-card-topline"><span className={resource.kind === 'Dokument' ? 'kind-chip doc' : resource.kind === 'Ersatzteil' ? 'kind-chip part' : 'kind-chip community'}>{resource.kind}</span><span className="resource-label">{resource.label}</span></div>
      <h3><a href={resource.href} target={resource.external ? '_blank' : undefined} rel={resource.external ? 'nofollow noreferrer' : undefined}>{resource.title}</a></h3>
      <p>{resource.description}</p>
      <div className="tag-row">{resource.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="resource-card-actions">
        {resource.sourceHref && <a className="resource-source-link" href={resource.sourceHref} target="_blank" rel="nofollow noreferrer">Quelle: {resource.sourceLabel ?? 'BTM Community'} ↗</a>}
      </div>
    </article>
  );
}

function GuideHeader() {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Black Tea Motorbikes – Hilfe Startseite">
          <span className="wordmark-mark" aria-hidden="true">BTM</span>
          <span>black tea motorbikes – <strong>hilfe</strong></span>
        </a>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="/#status">Status</a>
          <RepairMenu />
          <a href="/ersatzteile">Ersatzteile</a>
          <BikeMenu />
          <a href="/#wissen">PDFs</a>
          <a href="/quellen">Quellen</a>
        </nav>
        <AccountMenu />
      </header>
      <BugReportWidget />
    </>
  );
}

function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const unreadCount = user?.notifications.filter((notification) => !notification.readAt).length ?? 0;

  if (loading) return <span className="header-link account-link account-loading">Konto</span>;
  if (!user) return <a className="header-link account-link" href="/login">Einloggen ↗</a>;

  return (
    <div className="nav-dropdown account-menu">
      <button className="nav-dropdown-trigger account-menu-trigger" type="button" aria-haspopup="menu">
        <AvatarBadge user={user} compact />
        <span className="account-menu-name">{user.name}</span>
        {unreadCount > 0 && <span className="account-unread-count" aria-label={`${unreadCount} ungelesene Benachrichtigungen`}>{unreadCount}</span>}
        <span className="nav-dropdown-caret" aria-hidden="true" />
      </button>
      <div className="nav-dropdown-menu account-menu-dropdown" role="menu">
        <a className="nav-dropdown-item" href="/konto" role="menuitem"><strong>Mein Bereich{unreadCount > 0 ? ` · ${unreadCount} neu` : ''}</strong><span>Bike, Kilometer &amp; Benachrichtigungen</span></a>
        <button className="account-logout" type="button" onClick={() => { void logout(); }}>Ausloggen</button>
      </div>
    </div>
  );
}

function RepairMenu() {
  return (
    <div className="nav-dropdown">
      <button className="nav-dropdown-trigger" type="button" aria-haspopup="menu">
        Reparatur <span className="nav-dropdown-caret" aria-hidden="true" />
      </button>
      <div className="nav-dropdown-menu" role="menu">
        <a className="nav-dropdown-item" href="/hilfe" role="menuitem">
          <strong>Reparaturhilfen</strong>
          <span>Alle Anleitungen öffnen</span>
        </a>
        <a className="nav-dropdown-item" href={repairRequestPath} role="menuitem">
          <strong>Reparatur anfragen</strong>
          <span>Frage stellen und Lösung teilen</span>
        </a>
      </div>
    </div>
  );
}

function BikeMenu() {
  return (
    <div className="nav-dropdown">
      <button className="nav-dropdown-trigger" type="button" aria-haspopup="menu">
        Bikes <span className="nav-dropdown-caret" aria-hidden="true" />
      </button>
      <div className="nav-dropdown-menu" role="menu">
        {bikeProfiles.map((bike) => (
          <a className="nav-dropdown-item" href={bike.path} role="menuitem" key={bike.slug}>
            <strong>{bike.name}</strong>
            <span>Wiki-Seite öffnen</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function BugReportWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setPageUrl(window.location.href);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setReportError('');
    setReportNotice('');
    setIssueUrl('');
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.pageUrl = pageUrl || window.location.href;
    if (user) {
      payload.name = user.name;
      payload.email = user.email;
    }

    try {
      const response = await apiJson<{ message: string; issueUrl?: string }>('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      form.reset();
      setPageUrl(window.location.href);
      setReportNotice(response.message);
      setIssueUrl(response.issueUrl ?? '');
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Die Bugmeldung konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setOpen(false);
  };

  return (
    <>
      <button className="bug-report-trigger" type="button" aria-label="Fehler oder Bug melden" aria-expanded={open} aria-controls="bug-report-dialog" onClick={() => setOpen(true)}>
        <span aria-hidden="true">🐞</span>
      </button>
      {open && (
        <div className="bug-report-overlay" onMouseDown={handleBackdropMouseDown}>
          <section className="bug-report-dialog card-doodle" id="bug-report-dialog" role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
            <div className="bug-report-dialog-header">
              <div>
                <div className="eyebrow handwritten">fehler gefunden?</div>
                <h2 id="bug-report-title">Bug melden</h2>
              </div>
              <button className="bug-report-close" type="button" aria-label="Bugmeldung schließen" onClick={() => setOpen(false)}>×</button>
            </div>
            <p className="bug-report-intro">Hilf uns, Fehler schnell nachzuvollziehen. Nach deiner E-Mail-Bestätigung wird die Meldung automatisch als GitHub-Issue angelegt und redaktionell weiterbearbeitet.</p>
            <form className="comment-form bug-report-form" onSubmit={handleSubmit}>
              <label>Überschrift<input name="title" required minLength={2} maxLength={160} placeholder="z. B. Link auf der Reparaturseite funktioniert nicht" /></label>
              {!user && <div className="comment-form-grid">
                <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
                <label>E-Mail<input name="email" type="email" required maxLength={180} autoComplete="email" /><small>wird nicht öffentlich ins Issue geschrieben</small></label>
              </div>}
              <label>Fundstelle<input name="pageUrl" value={pageUrl} readOnly aria-readonly="true" /><small>Diese URL wird automatisch aus der aktuellen Seite übernommen.</small></label>
              <label>Beschreibung<textarea name="description" required minLength={10} maxLength={8000} rows={6} placeholder="Was ist passiert? Welche Schritte führen zum Fehler?" /></label>
              <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              {reportError && <p className="form-message form-message-error" role="alert">{reportError}</p>}
              {reportNotice && <div className="form-message form-message-success" role="status"><p>{reportNotice}</p>{issueUrl && <a href={issueUrl} target="_blank" rel="noreferrer">GitHub-Issue öffnen ↗</a>}</div>}
              <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird an GitHub übergeben …' : 'Bugmeldung senden'} <span aria-hidden="true">↗</span></button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function GuideFooter() {
  return (
    <footer className="site-footer">
      <span className="wordmark"><span className="wordmark-mark" aria-hidden="true">BTM</span>black tea motorbikes – <strong>hilfe</strong></span>
      <span className="handwritten">gebaut für die leute, die weiterfahren wollen.</span>
      <span className="footer-links"><a href={localPartArchiveHref}>Quellen &amp; Archivstand</a><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></span>
      <a href="/hilfe">zur Reparatur ↑</a>
    </footer>
  );
}

function WikiPage() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Wiki — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  const matches = useMemo(() => getWikiSearchMatches(query), [query]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="wiki-page-main" aria-label="Bike-Wiki">
        <section className="wiki-index-hero section-pad">
          <div className="eyebrow handwritten">wiki · black tea bikes</div>
          <h1>Das Bike-Wiki.</h1>
          <p>Technische Grundlagen, Handbuchdaten und nachvollziehbare Hinweise zu Bonfire und Wildfire — gemeinsam aufgebaut und redaktionell geprüft.</p>
        </section>
        <section className="wiki-index-section section-pad">
          <div className="wiki-search card-doodle">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Bike-Wiki durchsuchen</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Reifen, Ladegerät, Akku, Wildfire …" />
            </label>
            <span className="wiki-search-count">{query.trim() ? `${matches.length} Treffer` : `${wikiArticles.length} Bike-Wikis`}</span>
          </div>

          <div className="wiki-index-grid">
            {matches.map(({ article, sections }, index) => (
              <article className={`wiki-index-card card-doodle ${index % 2 ? 'wiki-index-card-tilt-right' : 'wiki-index-card-tilt-left'}`} key={article.path}>
                <div className="wiki-index-card-topline"><span className="kind-chip doc">{article.model}</span><span>{article.status}</span></div>
                <h2><a href={article.path}>{highlightWikiText(article.title, query, `wiki-card-title-${article.slug}`)}</a></h2>
                <p>{highlightWikiText(article.intro, query, `wiki-card-intro-${article.slug}`)}</p>
                <div className="wiki-index-topics">
                  {sections.slice(0, 4).map((section) => <a href={`${article.path}#${section.id}`} key={`${article.path}-${section.id}`}>{highlightWikiText(section.label, query, `wiki-card-section-${article.slug}-${section.id}`)}</a>)}
                </div>
                <a className="resource-link" href={article.path}>Wiki-Artikel öffnen ↗</a>
              </article>
            ))}
          </div>
          {matches.length === 0 && <div className="empty-state card-doodle">Nichts gefunden. Versuch es mit „Bonfire“, „Wildfire“, „Reifen“ oder „Akku“.</div>}
          <p className="content-note handwritten">Jede Überschrift ist offen für Ergänzungen. Ein Hinweis über „Bearbeiten“ landet zuerst bei uns zur Prüfung.</p>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function BikePage({ bike, article }: { bike: BikeProfile; article?: WikiArticle }) {
  useEffect(() => {
    document.title = article
      ? `${article.title} — ${article.model} — Black Tea Motorbikes – Hilfe`
      : `${bike.name} — Bikes — Black Tea Motorbikes – Hilfe`;
    window.scrollTo(0, 0);
  }, [article?.model, article?.title, bike.name]);

  if (article) return <WikiArticlePage article={article} />;

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="bike-page-main">
        <section className="bike-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">bikes · wiki-artikel</div>
          <h1>{bike.name}</h1>
          <p>{bike.intro}</p>
        </section>
        <section className="bike-placeholder-section section-pad">
          <article className="bike-placeholder card-doodle">
            <div className="eyebrow handwritten">inhalt folgt</div>
            <h2>Diese Seite wird gerade aufgebaut.</h2>
            <p>Hier entsteht eine übersichtliche Wiki-Seite mit technischen Daten, Modellvarianten, Handbuchauszügen und verlinkten Quellen.</p>
          </article>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function WikiArticlePage({ article }: { article: WikiArticle }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = `${article.title} — ${article.model} — Black Tea Motorbikes – Hilfe`;
    window.scrollTo(0, 0);
  }, [article.model, article.title]);

  const sourceIsExternal = article.sourceHref?.startsWith('http') ?? false;
  const modelPath = `/bikes/${article.model.toLowerCase()}`;
  const toc = getWikiToc(article.body);
  const searchResults = useMemo(() => getWikiArticleSearchResults(article.body, query), [article.body, query]);
  const [editingHeading, setEditingHeading] = useState<string | null>(null);
  useEffect(() => {
    if (!editingHeading) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingHeading(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [editingHeading]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="wiki-article-page-main">
        <section className="wiki-article-page-hero section-pad">
          <div className="wiki-breadcrumb">
            <a className="repair-back" href={article.path === modelPath ? '/' : modelPath}>← {article.path === modelPath ? 'Zur Sammelmappe' : `Zur ${article.model}-Übersicht`}</a>
            <div className="eyebrow handwritten">wiki · {article.model}</div>
          </div>
          <h1>{highlightWikiText(article.title, query, 'wiki-article-hero-title')}</h1>
          <p>{highlightWikiText(article.intro, query, 'wiki-article-hero-intro')}</p>
        </section>
        <section className="wiki-article-section section-pad">
          <div className="wiki-search wiki-article-search card-doodle">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">In diesem Wiki suchen</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`z. B. Akku, Reifen, ${article.model}, Ladegerät …`} />
            </label>
            <span className="wiki-search-count">{query.trim() ? `${searchResults.length} Treffer` : `${toc.length} Abschnitte`}</span>
          </div>
          {query.trim() && (
            <div className="wiki-article-search-results" aria-live="polite">
              {searchResults.length ? <><span className="wiki-article-search-results-label">Treffer im Artikel</span>{searchResults.map((result) => <a href={`#${result.id}`} key={result.id}>{highlightWikiText(result.label, query, `wiki-search-result-${result.id}`)} ↗</a>)}</> : <span>Keine passende Stelle gefunden. Versuch es mit „Akku“, „Reifen“ oder „Ladegerät“.</span>}
            </div>
          )}
          <div className="wiki-article-layout">
            {toc.length > 0 && (
              <nav className="wiki-toc card-doodle" aria-label="Inhaltsverzeichnis">
                <div className="eyebrow handwritten">auf dieser seite</div>
                <h2>Inhalt</h2>
                <ol>
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? 'wiki-toc-subitem' : undefined}>
                      <a href={`#${item.id}`}>{highlightWikiText(item.label, query, `wiki-toc-${item.id}`)}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <article className="wiki-article card-doodle">
              <div className="wiki-article-topline"><span className="kind-chip doc">Wiki-Artikel</span><span>{article.status}</span></div>
              <div className="wiki-markdown">{renderWikiMarkdown(article.body, setEditingHeading, query)}</div>
              <WikiContributions guideSlug={`wiki-${article.slug}`} editingHeading={editingHeading} onCloseEditor={() => setEditingHeading(null)} />
              {article.sourceHref && (
                <div className="wiki-source-box">
                  <span className="repair-subhead">Quellenangabe</span>
                  <a href={article.sourceHref} target={sourceIsExternal ? '_blank' : undefined} rel={sourceIsExternal ? 'nofollow noreferrer' : undefined}>
                    {article.sourceLabel ?? 'Lokale Quelle öffnen'} ↗
                  </a>
                </div>
              )}
            </article>
          </div>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function WikiContributions({ guideSlug, editingHeading, onCloseEditor }: { guideSlug: string; editingHeading: string | null; onCloseEditor: () => void }) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const loadContributions = async () => {
    try {
      const payload = await apiJson<FeedbackSummary>(`/api/feedback/${guideSlug}`);
      setSummary(payload);
    } catch {
      setSummary({ guide: guideSlug, up: 0, down: 0, comments: [] });
    }
  };

  useEffect(() => {
    void loadContributions();
  }, [guideSlug]);

  return (
    <section className="wiki-contributions" aria-label="Wiki-Ergänzung vorschlagen">
      <div className="wiki-contributions-heading">
        <div>
          <div className="eyebrow handwritten">mitmachen</div>
          <h3>Etwas ergänzen oder korrigieren?</h3>
        </div>
        <span className="comment-count">{summary?.comments.length ?? 0} freigegeben</span>
      </div>
      <p className="wiki-contributions-intro">Du hast eine technische Angabe, ein Foto oder eine Korrektur? Schick sie uns direkt hier. Wir prüfen jeden Vorschlag redaktionell und übernehmen bestätigte Informationen ins Wiki.</p>
      <details className="wiki-inline-contribution">
        <summary><span>Wiki-Ergänzung vorschlagen</span><span className="wiki-inline-contribution-toggle" aria-hidden="true">aufklappen ↓</span></summary>
        <WikiContributionForm guideSlug={guideSlug} onSubmitted={loadContributions} />
      </details>
      <div className="approved-comments wiki-approved-contributions">
        {summary?.comments.length ? summary.comments.map((comment) => {
          const sourceIsExternal = /^https?:\/\//i.test(comment.source ?? '');
          return (
            <article className="approved-comment wiki-approved-contribution" key={comment.id}>
              <div className="approved-comment-topline"><PublicCommentAuthor comment={comment} /><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('de-DE')}</time></div>
              {comment.topic && <h4>{comment.topic}</h4>}
              {comment.section && <small className="wiki-contribution-section">Bezug: {comment.section}</small>}
              <p>{comment.body}</p>
              {comment.source && (sourceIsExternal ? <a className="wiki-contribution-source" href={comment.source} target="_blank" rel="nofollow noreferrer">Quelle prüfen ↗</a> : <small className="wiki-contribution-source">Quelle: {comment.source}</small>)}
              {comment.imageUrl && <img src={comment.imageUrl} alt={`Bild von ${comment.name}`} loading="lazy" />}
            </article>
          );
        }) : <p className="no-comments">Noch keine freigegebenen Ergänzungen.</p>}
      </div>
      {editingHeading && (
        <div className="wiki-contribution-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseEditor(); }}>
          <div className="wiki-contribution-dialog card-doodle" role="dialog" aria-modal="true" aria-labelledby="wiki-contribution-dialog-title">
            <div className="wiki-contribution-dialog-topline"><span className="eyebrow handwritten">wiki-bearbeitung</span><button className="wiki-contribution-modal-close" type="button" onClick={onCloseEditor} aria-label="Fenster schließen">×</button></div>
            <h3 id="wiki-contribution-dialog-title">Etwas ergänzen oder korrigieren?</h3>
            <p className="wiki-contribution-dialog-context">Du beziehst dich auf die Überschrift „{editingHeading}“. Beschreibe möglichst genau, welche Information dort ergänzt oder geändert werden sollte.</p>
            <WikiContributionForm guideSlug={guideSlug} heading={editingHeading} onSubmitted={loadContributions} />
          </div>
        </div>
      )}
    </section>
  );
}

function WikiContributionForm({ guideSlug, heading, onSubmitted }: { guideSlug: string; heading?: string; onSubmitted: () => Promise<void> | void }) {
  const { user } = useAuth();
  const [contributionError, setContributionError] = useState('');
  const [contributionNotice, setContributionNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setContributionError('');
    setContributionNotice('');
    if (file && file.size > 1048576) {
      setSelectedFile(null);
      event.target.value = '';
      setContributionError('Das Bild darf höchstens 1 MB groß sein.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setContributionError('');
    setContributionNotice('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('guide', guideSlug);
    formData.set('kind', 'wiki_suggestion');
    formData.delete('image');
    if (selectedFile) formData.append('image', selectedFile);

    try {
      await apiJson<{ message: string }>('/api/comments', { method: 'POST', body: formData });
      form.reset();
      setSelectedFile(null);
      setContributionNotice(user ? 'Danke! Dein Wiki-Vorschlag ist bei uns zur redaktionellen Prüfung vorgemerkt.' : 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet dein Wiki-Vorschlag bei uns zur redaktionellen Prüfung.');
      await onSubmitted();
    } catch (error) {
      setContributionError(error instanceof Error ? error.message : 'Der Vorschlag konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form wiki-contribution-form" onSubmit={handleSubmit}>
      <input type="hidden" name="section" value={heading ?? ''} />
      <label>Thema oder kurze Überschrift<input name="topic" defaultValue={heading} required minLength={2} maxLength={120} placeholder="z. B. Reifengröße der Bonfire X" /></label>
      {user ? <><input type="hidden" name="name" value={user.name} /><input type="hidden" name="email" value={user.email} /></> : <div className="comment-form-grid">
        <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
        <label>E-Mail<input name="email" type="email" required maxLength={180} autoComplete="email" /><small>Bestätigungslink per Mail; danach beginnt die redaktionelle Prüfung.</small></label>
      </div>}
      <label>Dein Vorschlag<textarea name="body" required minLength={10} maxLength={4000} rows={5} placeholder="Was sollte ergänzt, geändert oder belegt werden?" /></label>
      <label>Quelle (optional)<input name="source" maxLength={500} placeholder="z. B. Bonfire-Handbuch, S. 12 oder https://…" /><small>Eine Seitenzahl, PDF oder Webadresse hilft bei der Prüfung.</small></label>
      <label>Bild (optional, max. 1 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} /><small>JPG, PNG, WEBP oder GIF</small></label>
      <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {contributionError && <p className="form-message form-message-error" role="alert">{contributionError}</p>}
      {contributionNotice && <p className="form-message form-message-success" role="status">{contributionNotice}</p>}
      <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird geprüft …' : 'Vorschlag zur Prüfung senden'} <span aria-hidden="true">↗</span></button>
    </form>
  );
}

function RepairTabs({ active }: { active: 'guides' | 'requests' }) {
  return (
    <nav className="repair-tabs" aria-label="Reparaturbereich">
      <a className={active === 'guides' ? 'active' : undefined} href="/hilfe" aria-current={active === 'guides' ? 'page' : undefined}>Reparaturhilfen</a>
      <a className={active === 'requests' ? 'active' : undefined} href={repairRequestPath} aria-current={active === 'requests' ? 'page' : undefined}>Reparatur anfragen</a>
    </nav>
  );
}

function RepairGuideIndexPage() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Reparaturhilfe — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  const filteredGuides = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de');
    if (!normalizedQuery) return repairGuides;

    return repairGuides.filter((guide) => {
      const searchable = [
        guide.title,
        guide.model,
        guide.intro,
        guide.safety,
        guide.sourceLabel,
        ...guide.steps,
        ...guide.detailSections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.bullets ?? [])]),
      ].join(' ').toLocaleLowerCase('de');
      return searchable.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="repair-page-main">
        <section className="repair-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">kurz erklärt, sauber belegt</div>
          <h1>Reparaturhilfe</h1>
          <p>Konkrete, redaktionell geprüfte Reparaturhilfen für typische BTM-Fehlerbilder. Keine Forendiskussionen — nur Ablauf, Prüfung, Sicherheit und Quelle.</p>
          <RepairTabs active="guides" />
        </section>
        <section className="repair-index-section section-pad">
          <div className="repair-search card-doodle">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Reparaturhilfen durchsuchen</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Akku, Ladegerät, Controller, Bremse …" />
            </label>
            <span className="repair-search-count">{query.trim() ? `${filteredGuides.length} Treffer` : `${repairGuides.length} Reparaturhilfen`}</span>
          </div>
          <div className="repair-index-grid">
            {filteredGuides.map((guide, index) => (
              <article className={`repair-index-card card-doodle ${index % 2 === 1 ? 'repair-index-card-tilt-right' : 'repair-index-card-tilt-left'}`} key={guide.id}>
                <div className="repair-guide-topline"><span className="kind-chip community">Anleitung</span><span>{guide.model}</span></div>
                <h2><a href={guide.path}>{guide.title}</a></h2>
                <p>{guide.intro}</p>
              </article>
            ))}
          </div>
          {filteredGuides.length === 0 && <div className="empty-state card-doodle">Nichts gefunden. Versuch es mit „Akku“, „Wildfire“, „Controller“ oder „Ladegerät“.</div>}
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function RepairRequestPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.title = 'Reparatur anfragen — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="repair-page-main repair-request-page">
        <section className="repair-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">gemeinsam eingrenzen, sauber dokumentieren</div>
          <h1>Reparatur anfragen</h1>
          <p>Beschreibe dein Fehlerbild, stelle Fragen und teile Lösungsansätze. Beiträge werden vor der Veröffentlichung geprüft und können später als redaktionelle Reparaturhilfe aufbereitet werden.</p>
          <RepairTabs active="requests" />
        </section>
        <section className="repair-request-submit-section section-pad">
          <details className="repair-request-submit card-doodle">
            <summary className="repair-request-summary">
              <div>
                <div className="eyebrow handwritten">neue frage</div>
                <h2>Was ist an deinem Bike los?</h2>
              </div>
              <div className="repair-request-summary-action">
                <span className="kind-chip community">moderiert</span>
                <span className="repair-request-toggle repair-request-toggle-closed">Formular öffnen ↓</span>
                <span className="repair-request-toggle repair-request-toggle-open">Formular schließen ↑</span>
              </div>
            </summary>
            <div className="repair-request-submit-content">
              <p className="repair-request-intro">Je genauer Modell, Baujahr, Akkuvariante, Fehlerbild und bereits geprüfte Punkte sind, desto leichter kann die Community sinnvoll antworten.</p>
              <RepairRequestForm onSubmitted={() => setRefreshKey((value) => value + 1)} />
            </div>
          </details>
        </section>
        <RepairRequestBoard refreshKey={refreshKey} />
      </main>
      <GuideFooter />
    </div>
  );
}

function RepairRequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth();
  const [requestError, setRequestError] = useState('');
  const [requestNotice, setRequestNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setRequestError('');
    setRequestNotice('');
    if (file && file.size > 1048576) {
      setSelectedFile(null);
      event.target.value = '';
      setRequestError('Das Bild darf höchstens 1 MB groß sein.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setRequestError('');
    setRequestNotice('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('guide', repairRequestGuideSlug);
    formData.set('kind', 'repair_request');
    formData.delete('image');
    if (selectedFile) formData.append('image', selectedFile);

    try {
      await apiJson<{ message: string }>('/api/comments', { method: 'POST', body: formData });
      form.reset();
      setSelectedFile(null);
      setRequestNotice(user ? 'Danke! Deine Reparaturanfrage ist bei uns zur redaktionellen Prüfung vorgemerkt.' : 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet deine Reparaturanfrage bei uns zur redaktionellen Prüfung.');
      onSubmitted();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Die Anfrage konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form repair-request-form" onSubmit={handleSubmit}>
      <label>Thema oder Fehlerbild<input name="topic" required minLength={2} maxLength={120} placeholder="z. B. Wildfire startet nach dem Laden nicht" /></label>
      <div className="comment-form-grid">
        <label>Modell / Bereich
          <select name="section" defaultValue="">
            <option value="">Bitte auswählen</option>
            <option>Bonfire</option>
            <option>Bonfire X</option>
            <option>Wildfire</option>
            <option>Akku / BMS</option>
            <option>Laden / 12-V-Elektrik</option>
            <option>Controller / Motor</option>
            <option>Fahrwerk / Bremse</option>
            <option>Sonstiges</option>
          </select>
        </label>
        {user ? <><input type="hidden" name="name" value={user.name} /><input type="hidden" name="email" value={user.email} /></> : <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>}
      </div>
      {!user && <label>E-Mail<input name="email" type="email" required maxLength={180} autoComplete="email" /><small>Bestätigungslink per Mail; danach beginnt die redaktionelle Prüfung.</small></label>}
      <label>Beschreibung<textarea name="body" required minLength={10} maxLength={4000} rows={7} placeholder="Modell, Baujahr, genaue Symptome, wann der Fehler auftritt und was bereits geprüft wurde …" /></label>
      <label>Quelle oder weitere Infos (optional)<input name="source" maxLength={500} placeholder="z. B. Handbuch Seite 12 oder https://…" /></label>
      <label>Bild (optional, max. 1 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} /><small>JPG, PNG, WEBP oder GIF</small></label>
      <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {requestError && <p className="form-message form-message-error" role="alert">{requestError}</p>}
      {requestNotice && <p className="form-message form-message-success" role="status">{requestNotice}</p>}
      <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird geprüft …' : 'Reparaturanfrage senden'} <span aria-hidden="true">↗</span></button>
    </form>
  );
}

function RepairRequestBoard({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [boardError, setBoardError] = useState('');

  const loadRequests = async () => {
    try {
      const payload = await apiJson<FeedbackSummary>(`/api/feedback/${repairRequestGuideSlug}`);
      setSummary(payload);
      setBoardError('');
    } catch (error) {
      setSummary({ guide: repairRequestGuideSlug, up: 0, down: 0, comments: [] });
      setBoardError(error instanceof Error ? error.message : 'Anfragen konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [refreshKey]);

  const comments = summary?.comments ?? [];
  const requests = comments.filter((comment) => comment.kind === 'repair_request');
  const answerCountsByRequest = new Map<string, number>();
  comments.filter((comment) => comment.kind === 'repair_answer').forEach((answer) => {
    if (!answer.parentId) return;
    answerCountsByRequest.set(answer.parentId, (answerCountsByRequest.get(answer.parentId) ?? 0) + 1);
  });

  return (
    <section className="repair-request-board-section section-pad">
      <div className="section-heading compact">
        <div>
          <div className="eyebrow handwritten">offene fragen und lösungen</div>
          <h2>Was die Community gerade klärt.</h2>
        </div>
        <span className="comment-count">{requests.length} freigegeben</span>
      </div>
      {boardError && <p className="form-message form-message-error" role="alert">{boardError}</p>}
      {requests.length ? (
        <div className="repair-request-grid">
          {requests.map((request, index) => <RepairRequestCard key={request.id} request={request} answerCount={answerCountsByRequest.get(request.id) ?? 0} index={index} />)}
        </div>
      ) : (
        <div className="empty-state card-doodle repair-request-empty"><h3>Noch keine freigegebene Anfrage.</h3><p>Starte oben die erste Frage. Nach der Prüfung kann die Community darauf antworten und die Lösung dokumentieren.</p></div>
      )}
    </section>
  );
}

function RepairRequestDetailPage({ requestId }: { requestId: string }) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [detailError, setDetailError] = useState('');
  const detailPath = repairRequestDetailPath(requestId);

  const loadRequest = async () => {
    try {
      const payload = await apiJson<FeedbackSummary>(`/api/feedback/${repairRequestGuideSlug}`);
      setSummary(payload);
      setDetailError('');
    } catch (error) {
      setSummary({ guide: repairRequestGuideSlug, up: 0, down: 0, comments: [] });
      setDetailError(error instanceof Error ? error.message : 'Die Reparaturanfrage konnte nicht geladen werden.');
    }
  };

  useEffect(() => {
    document.title = 'Reparaturanfrage — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
    void loadRequest();
  }, [requestId]);

  const comments = summary?.comments ?? [];
  const request = comments.find((comment) => comment.id === requestId && comment.kind === 'repair_request');
  const answers = comments.filter((comment) => comment.kind === 'repair_answer' && comment.parentId === requestId);

  useEffect(() => {
    if (!request) return;
    const title = `${request.topic ?? 'Reparaturanfrage'} — Reparaturhilfe — Black Tea Motorbikes – Hilfe`;
    const description = `${request.topic ?? 'Reparaturanfrage'}: ${request.body}`.slice(0, 155);
    applySeoMetadata({
      title,
      description,
      canonicalPath: detailPath,
      robots: 'noindex,follow,noarchive',
      jsonLd: {},
    });
  }, [detailPath, request]);

  if (summary && !request && !detailError) return <NotFoundPage path={detailPath} />;

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="repair-page-main repair-request-detail-page">
        <section className="repair-page-hero section-pad">
          <a className="repair-back" href={repairRequestPath}>← Alle offenen Fragen</a>
          <div className="eyebrow handwritten">{request?.section ?? 'reparaturanfrage'}</div>
          <h1>{request?.topic ?? 'Reparaturanfrage wird geladen …'}</h1>
          <p>{request ? 'Hier kannst du das Fehlerbild in Ruhe nachvollziehen und eine eigene Antwort oder Lösung teilen.' : 'Die freigegebene Anfrage und ihre Antworten werden geladen.'}</p>
          <RepairTabs active="requests" />
        </section>
        <section className="repair-request-detail-section section-pad">
          {detailError && <p className="form-message form-message-error" role="alert">{detailError}</p>}
          {!summary && !detailError && <div className="empty-state card-doodle repair-request-empty"><h2>Anfrage wird geladen …</h2><p>Einen Moment bitte.</p></div>}
          {request && (
            <div className="repair-request-detail-layout">
              <article className="repair-request-detail-card card-doodle">
                <div className="repair-request-card-topline"><span className="kind-chip community">Frage</span><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString('de-DE')}</time></div>
                <div className="approved-comment-topline"><PublicCommentAuthor comment={request} /><span>{request.section ?? 'Modell noch offen'}</span></div>
                <h2>Fehlerbild und bisherige Angaben</h2>
                <p className="repair-request-detail-body">{request.body}</p>
                {request.source && <p className="repair-request-source"><strong>Weitere Info:</strong> {request.source}</p>}
                <div className="repair-answers repair-request-detail-answers">
                  <div className="repair-answers-heading"><span className="eyebrow handwritten">antworten und lösungen</span><span className="comment-count">{answers.length}</span></div>
                  {answers.length ? answers.map((answer) => (
                    <article className="repair-answer" key={answer.id}>
                      <div className="approved-comment-topline"><PublicCommentAuthor comment={answer} /><time dateTime={answer.createdAt}>{new Date(answer.createdAt).toLocaleDateString('de-DE')}</time></div>
                      <p>{answer.body}</p>
                      {answer.source && <small>Quelle: {answer.source}</small>}
                      {answer.imageUrl && <img src={answer.imageUrl} alt={`Bild von ${answer.name}`} loading="lazy" />}
                    </article>
                  )) : <p className="no-comments">Noch keine Antwort. Vielleicht kennst du den ersten Lösungsansatz?</p>}
                </div>
              </article>
              <aside className="repair-request-answer-panel card-doodle">
                <div className="eyebrow handwritten">dein lösungsansatz</div>
                <h2>Antwort oder Lösung teilen</h2>
                <p>Beschreibe, was du geprüft, gemessen oder erfolgreich repariert hast. Auch Antworten werden vor der Veröffentlichung moderiert.</p>
                <RepairAnswerForm parentId={request.id} onSubmitted={loadRequest} />
              </aside>
            </div>
          )}
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function RepairRequestCard({ request, answerCount, index }: { request: PublicComment; answerCount: number; index: number }) {
  const detailPath = repairRequestDetailPath(request.id);

  return (
    <article className={`repair-request-card card-doodle ${index % 2 ? 'repair-request-card-tilt-right' : 'repair-request-card-tilt-left'}`}>
      <div className="repair-request-card-topline"><span className="kind-chip community">Frage</span><span>{request.section ?? 'Modell noch offen'}</span></div>
      <h3><a className="repair-request-title-link" href={detailPath}>{request.topic ?? 'Reparaturanfrage'} ↗</a></h3>
      <div className="approved-comment-topline"><PublicCommentAuthor comment={request} /><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString('de-DE')}</time></div>
      <p className="repair-request-body">{request.body}</p>
      {request.source && <p className="repair-request-source"><strong>Weitere Info:</strong> {request.source}</p>}
      <div className="repair-answers">
        <div className="repair-answers-heading"><span className="eyebrow handwritten">antworten und lösungen</span><span className="comment-count">{answerCount}</span></div>
        <p className="no-comments">{answerCount ? `${answerCount} geprüfte Antwort${answerCount === 1 ? '' : 'en'} auf der Anfrageseite.` : 'Noch keine Antwort. Teile den ersten Lösungsansatz auf der Anfrageseite.'}</p>
      </div>
      <a className="repair-request-open-link" href={detailPath}>Anfrage öffnen und kommentieren ↗</a>
    </article>
  );
}

function RepairAnswerForm({ parentId, onSubmitted }: { parentId: string; onSubmitted: () => Promise<void> | void }) {
  const { user } = useAuth();
  const [answerError, setAnswerError] = useState('');
  const [answerNotice, setAnswerNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAnswerError('');
    setAnswerNotice('');
    if (file && file.size > 1048576) {
      setSelectedFile(null);
      event.target.value = '';
      setAnswerError('Das Bild darf höchstens 1 MB groß sein.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setAnswerError('');
    setAnswerNotice('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('guide', repairRequestGuideSlug);
    formData.set('kind', 'repair_answer');
    formData.set('parentId', parentId);
    formData.delete('image');
    if (selectedFile) formData.append('image', selectedFile);

    try {
      await apiJson<{ message: string }>('/api/comments', { method: 'POST', body: formData });
      form.reset();
      setSelectedFile(null);
      setAnswerNotice(user ? 'Danke! Deine Antwort ist bei uns zur redaktionellen Prüfung vorgemerkt.' : 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet deine Antwort bei uns zur redaktionellen Prüfung.');
      await onSubmitted();
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'Die Antwort konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form repair-answer-form" onSubmit={handleSubmit}>
      {user ? <><input type="hidden" name="name" value={user.name} /><input type="hidden" name="email" value={user.email} /></> : <div className="comment-form-grid">
        <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
        <label>E-Mail<input name="email" type="email" required maxLength={180} autoComplete="email" /><small>Bestätigungslink per Mail; danach beginnt die redaktionelle Prüfung.</small></label>
      </div>}
      <label>Dein Lösungsansatz<textarea name="body" required minLength={10} maxLength={4000} rows={5} placeholder="Was hast du geprüft, gemessen oder erfolgreich repariert?" /></label>
      <label>Quelle (optional)<input name="source" maxLength={500} placeholder="z. B. Handbuch, Teilenummer oder https://…" /></label>
      <label>Bild (optional, max. 1 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} /></label>
      <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {answerError && <p className="form-message form-message-error" role="alert">{answerError}</p>}
      {answerNotice && <p className="form-message form-message-success" role="status">{answerNotice}</p>}
      <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird geprüft …' : 'Antwort zur Prüfung senden'} <span aria-hidden="true">↗</span></button>
    </form>
  );
}

function RepairGuidePage({ guide }: { guide: RepairGuide }) {
  useEffect(() => {
    document.title = `${guide.title} — Black Tea Motorbikes – Hilfe`;
    window.scrollTo(0, 0);
  }, [guide.title]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="repair-page-main">
        <section className="repair-page-hero section-pad">
          <a className="repair-back" href="/hilfe">← Alle Reparaturhilfen</a>
          <div className="eyebrow handwritten">{guide.model}</div>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
        </section>
        <section className="repair-detail-section section-pad">
          <article className="repair-detail card-doodle">
            <div className="repair-detail-topline"><span className="kind-chip community">Anleitung</span><span>Stand: 02.09.2026</span></div>
            <h2>Kurzablauf</h2>
            <ol className="repair-steps">{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <RepairFeedback guideSlug={guide.id} />
            <p className="repair-safety">⚠ {guide.safety}</p>
            <div className="repair-longread">
              <div className="eyebrow handwritten">mehr lesen</div>
              <h2>Ausführliche Reparaturhilfe</h2>
              {guide.detailSections.map((section) => (
                <section className="repair-longread-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
                </section>
              ))}
            </div>
            <RepairComments guideSlug={guide.id} />
            <div className="repair-source-box">
              <span className="repair-subhead">Quellenangabe</span>
              <p>Diese Anleitung ist redaktionell aus den Community-Hinweisen aufbereitet. Die Quelle dient zum Nachvollziehen und Gegenprüfen — sie ersetzt keine Fachprüfung und keine fahrzeugspezifische Freigabe.</p>
              <a href={guide.sourceHref} target="_blank" rel="nofollow noreferrer">{guide.sourceLabel} ↗</a>
            </div>
          </article>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function RepairFeedback({ guideSlug }: { guideSlug: string }) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [selectedVote, setSelectedVote] = useState<'up' | 'down' | null>(() => {
    try {
      const stored = window.localStorage.getItem(`btm-feedback:${guideSlug}`);
      return stored === 'up' || stored === 'down' ? stored : null;
    } catch {
      return null;
    }
  });
  const [voteNotice, setVoteNotice] = useState('');

  const loadFeedback = async () => {
    try {
      const payload = await apiJson<FeedbackSummary>(`/api/feedback/${guideSlug}`);
      setSummary(payload);
    } catch {
      setSummary({ guide: guideSlug, up: 0, down: 0, comments: [] });
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, [guideSlug]);

  const handleVote = async (value: 'up' | 'down') => {
    if (selectedVote) {
      setVoteNotice('Deine Bewertung ist für diese Hilfe bereits gespeichert.');
      return;
    }
    setVoteNotice('');
    try {
      const payload = await apiJson<Pick<FeedbackSummary, 'guide' | 'up' | 'down'>>('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide: guideSlug, value }),
      });
      setSummary((current) => ({ guide: guideSlug, up: payload.up, down: payload.down, comments: current?.comments ?? [] }));
      setSelectedVote(value);
      setVoteNotice('Danke für deine Rückmeldung.');
      try {
        window.localStorage.setItem(`btm-feedback:${guideSlug}`, value);
      } catch {
        // Local storage can be disabled; the server-side vote is still saved.
      }
    } catch (error) {
      setVoteNotice(error instanceof Error ? error.message : 'Die Bewertung konnte nicht gespeichert werden.');
    }
  };

  return (
    <section className="repair-feedback" aria-label="Rückmeldung zur Reparaturhilfe">
      <div className="repair-feedback-vote card-doodle">
        <div>
          <div className="eyebrow handwritten">deine rückmeldung</div>
          <h3>War diese Hilfe nützlich?</h3>
          <p>Ein kurzer Daumen zeigt anderen direkt, ob sie hier richtig sind.</p>
        </div>
        <div className="repair-vote-actions">
          <button className={`vote-button ${selectedVote === 'up' ? 'is-selected' : ''}`} type="button" onClick={() => void handleVote('up')} aria-pressed={selectedVote === 'up'}>
            <span aria-hidden="true">👍</span> Ja <strong>{summary?.up ?? 0}</strong>
          </button>
          <button className={`vote-button ${selectedVote === 'down' ? 'is-selected' : ''}`} type="button" onClick={() => void handleVote('down')} aria-pressed={selectedVote === 'down'}>
            <span aria-hidden="true">👎</span> Noch nicht <strong>{summary?.down ?? 0}</strong>
          </button>
        </div>
        {voteNotice && <p className="feedback-notice" role="status">{voteNotice}</p>}
      </div>
    </section>
  );
}

function RepairComments({ guideSlug }: { guideSlug: string }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [commentError, setCommentError] = useState('');
  const [commentNotice, setCommentNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadFeedback = async () => {
    try {
      const payload = await apiJson<FeedbackSummary>(`/api/feedback/${guideSlug}`);
      setSummary(payload);
    } catch {
      setSummary({ guide: guideSlug, up: 0, down: 0, comments: [] });
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, [guideSlug]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCommentError('');
    setCommentNotice('');
    if (file && file.size > 1048576) {
      setSelectedFile(null);
      event.target.value = '';
      setCommentError('Das Bild darf höchstens 1 MB groß sein.');
      return;
    }
    setSelectedFile(file);
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setCommentError('');
    setCommentNotice('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('guide', guideSlug);
    formData.delete('image');
    if (selectedFile) formData.append('image', selectedFile);

    try {
      await apiJson<{ message: string }>('/api/comments', { method: 'POST', body: formData });
      form.reset();
      setSelectedFile(null);
      setCommentNotice(user ? 'Danke! Dein Kommentar ist bei uns zur redaktionellen Prüfung vorgemerkt.' : 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet dein Kommentar bei uns zur redaktionellen Prüfung.');
      await loadFeedback();
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Der Kommentar konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="repair-comments" aria-label="Erfahrung teilen">
      <div className="repair-comments-heading">
        <div>
          <div className="eyebrow handwritten">erfahrung teilen</div>
          <h3>Hinweis oder Ergänzung?</h3>
        </div>
        <span className="comment-count">{summary?.comments.length ?? 0} freigegeben</span>
      </div>
      <p className="repair-comments-intro">Schreib kurz, was bei dir funktioniert hat oder wo ein Schritt anders war. Kommentare werden vor der Veröffentlichung geprüft; deine E-Mail bleibt intern.</p>
      <form className="comment-form" onSubmit={handleCommentSubmit}>
        {user ? <><input type="hidden" name="name" value={user.name} /><input type="hidden" name="email" value={user.email} /></> : <div className="comment-form-grid">
          <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label>E-Mail<input name="email" type="email" required maxLength={180} autoComplete="email" /><small>Bestätigungslink per Mail; danach beginnt die redaktionelle Prüfung.</small></label>
        </div>}
        <label>Kommentar<textarea name="body" required minLength={10} maxLength={4000} rows={5} placeholder="Was hast du geprüft oder repariert?" /></label>
        <label>Bild (optional, max. 1 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} /><small>JPG, PNG, WEBP oder GIF</small></label>
        <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        {commentError && <p className="form-message form-message-error" role="alert">{commentError}</p>}
        {commentNotice && <p className="form-message form-message-success" role="status">{commentNotice}</p>}
        <button className="button button-ink" type="submit" disabled={submitting}>{submitting ? 'Wird geprüft …' : 'Kommentar zur Prüfung senden'} <span aria-hidden="true">↗</span></button>
      </form>
      <div className="approved-comments">
        {summary?.comments.length ? summary.comments.map((comment) => (
          <article className="approved-comment" key={comment.id}>
            <div className="approved-comment-topline"><PublicCommentAuthor comment={comment} /><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('de-DE')}</time></div>
            <p>{comment.body}</p>
            {comment.imageUrl && <img src={comment.imageUrl} alt={`Bild von ${comment.name}`} loading="lazy" />}
          </article>
        )) : <p className="no-comments">Noch keine freigegebenen Erfahrungsberichte.</p>}
      </div>
    </section>
  );
}

function AdminPage() {
  const { logout: logoutUser } = useAuth();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'moderator' | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [loginEmail, setLoginEmail] = useState('hallo@shortaktien.de');
  const [password, setPassword] = useState('');
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [adminSection, setAdminSection] = useState<'comments' | 'members' | 'newsletter' | 'notifications' | 'chat'>('comments');
  const [adminFilter, setAdminFilter] = useState<'all' | 'wiki' | 'comments' | 'requests'>('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Admin — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
    void checkSession();
  }, []);

  const loadComments = async () => {
    try {
      const payload = await apiJson<{ comments: AdminComment[] }>('/api/admin/comments');
      setComments(payload.comments);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'Nicht autorisiert.') {
        setAuthenticated(false);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Kommentare konnten nicht geladen werden.');
      }
    }
  };

  const loadMembers = async () => {
    try {
      const payload = await apiJson<{ users: AdminMember[] }>('/api/admin/users');
      setMembers(payload.users);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'Nicht autorisiert.') {
        setAuthenticated(false);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Mitglieder konnten nicht geladen werden.');
      }
    }
  };

  const checkSession = async () => {
    try {
      const payload = await apiJson<{ authenticated: boolean; email: string | null; role: 'admin' | 'moderator' | null; canManageMembers: boolean; csrfToken: string | null }>('/api/admin/session');
      setAuthenticated(payload.authenticated);
      setAdminEmail(payload.email ?? '');
      setAdminRole(payload.role);
      setCanManageMembers(payload.canManageMembers);
      setCsrfToken(payload.csrfToken ?? '');
      if (payload.authenticated) {
        await loadComments();
        if (payload.canManageMembers) await loadMembers();
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Admin-Sitzung konnte nicht geprüft werden.');
    } finally {
      setChecked(true);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = await apiJson<{ authenticated: boolean; email: string; role: 'admin'; canManageMembers: true; csrfToken: string }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      setAuthenticated(payload.authenticated);
      setAdminEmail(payload.email);
      setAdminRole(payload.role);
      setCanManageMembers(payload.canManageMembers);
      setCsrfToken(payload.csrfToken);
      setPassword('');
      await loadComments();
      await loadMembers();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (comment: AdminComment, status: 'pending' | 'approved') => {
    setBusy(true);
    setError('');
    try {
      const payload = await apiJson<{ comment: AdminComment }>(`/api/admin/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ status }),
      });
      setComments((current) => current.map((item) => item.id === comment.id ? payload.comment : item));
      setNotice(status === 'approved' ? 'Kommentar freigegeben.' : 'Kommentar zurückgestellt.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status konnte nicht geändert werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (comment: AdminComment) => {
    if (!window.confirm(`Kommentar von ${comment.name} wirklich löschen?`)) return;
    setBusy(true);
    setError('');
    try {
      await apiJson<{ deleted: boolean }>(`/api/admin/comments/${comment.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken } });
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setNotice('Kommentar gelöscht.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Kommentar konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleRepairDraftDownload = (request: AdminComment) => {
    const answers = comments.filter((comment) => comment.kind === 'repair_answer' && comment.parentId === request.id);
    const answerSection = answers.length
      ? answers.flatMap((answer) => [`### Antwort von ${answer.name}`, '', answer.body, ...(answer.source ? ['', `Quelle: ${answer.source}`] : []), ''])
      : ['Noch keine freigegebene Antwort.', ''];
    const markdown = [
      '---',
      `title: "${(request.topic ?? 'Neue Reparaturhilfe').replace(/"/g, '\\"')}"`,
      `model: "${(request.section ?? 'Bonfire oder Wildfire').replace(/"/g, '\\"')}"`,
      'status: Entwurf',
      '---',
      '',
      '## Fehlerbild',
      '',
      request.body,
      '',
      '## Lösungsansätze aus der Community',
      '',
      ...answerSection,
      '## Sicherheit',
      '',
      'Sicherheitskritische Arbeiten an Akku, BMS, Hochvolt, Controller, Bremsen und Fahrwerk gehören in qualifizierte Hände. Die Hinweise müssen vor Veröffentlichung fachlich und quellenbasiert geprüft werden.',
      '',
      ...(request.source ? ['## Ausgangsquelle', '', request.source, ''] : []),
    ].join('\n');
    const filename = `${slugify(request.topic ?? 'neue-reparaturhilfe') || 'neue-reparaturhilfe'}.md`;
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Markdown-Entwurf für die neue Reparaturhilfe wurde heruntergeladen.');
  };

  const handleLogout = async () => {
    if (adminRole === 'moderator') {
      await logoutUser();
    } else {
      await apiJson<{ authenticated: boolean }>('/api/admin/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    }
    setAuthenticated(false);
    setCsrfToken('');
    setComments([]);
    setMembers([]);
    setAdminEmail('');
    setAdminRole(null);
    setCanManageMembers(false);
  };

  const wikiSuggestions = comments.filter((comment) => comment.kind === 'wiki_suggestion');
  const repairRequests = comments.filter((comment) => comment.kind === 'repair_request' || comment.kind === 'repair_answer');
  const experienceComments = comments.filter((comment) => comment.kind === 'comment');
  const openComments = comments.filter((comment) => comment.status === 'pending');
  const visibleComments = adminFilter === 'wiki' ? wikiSuggestions : adminFilter === 'comments' ? experienceComments : adminFilter === 'requests' ? repairRequests : openComments;
  const filteredComments = useMemo(() => {
    const normalizedQuery = adminSearch.trim().toLocaleLowerCase('de');
    if (!normalizedQuery) return visibleComments;
    return visibleComments.filter((comment) => `${comment.topic ?? ''} ${comment.name} ${comment.email} ${comment.guide} ${comment.section ?? ''} ${comment.body} ${comment.kind ?? ''} ${comment.status}`.toLocaleLowerCase('de').includes(normalizedQuery));
  }, [adminSearch, visibleComments]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="admin-page-main">
        <section className="admin-page-hero section-pad">
          <div className="wiki-breadcrumb">
            <a className="repair-back" href="/hilfe">← Zur Reparaturhilfe</a>
            <div className="eyebrow handwritten">redaktion · intern</div>
          </div>
          <h1>Beiträge prüfen</h1>
          <p>Hier werden Erfahrungsberichte, Reparaturanfragen, Antworten und Wiki-Vorschläge geprüft, bevor sie öffentlich erscheinen.</p>
        </section>
        {!checked ? <p className="admin-loading section-pad">Sitzung wird geprüft …</p> : !authenticated ? (
          <section className="admin-login-section section-pad">
            <form className="admin-login card-doodle" onSubmit={handleLogin}>
              <div className="eyebrow handwritten">geschützter bereich</div>
              <h2>Anmelden</h2>
              <label>E-Mail<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" required autoComplete="username" /></label>
              <label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" /></label>
              {error && <p className="form-message form-message-error" role="alert">{error}</p>}
              <button className="button button-ink" type="submit" disabled={busy}>{busy ? 'Anmeldung …' : 'Admin öffnen'} <span aria-hidden="true">↗</span></button>
            </form>
          </section>
        ) : (
          <section className="admin-comments-section section-pad">
            <div className="admin-toolbar card-doodle">
              <div><span className="eyebrow handwritten">eingeloggt als</span><strong>{adminEmail} · {adminRole === 'moderator' ? 'Moderator' : 'Admin'}</strong></div>
              <button className="button button-ghost" type="button" onClick={() => void handleLogout()}>Abmelden</button>
            </div>
            {error && <p className="form-message form-message-error" role="alert">{error}</p>}
            {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
            <div className="admin-section-tabs" role="tablist" aria-label="Adminbereiche">
              <button className={adminSection === 'comments' ? 'active' : ''} type="button" role="tab" aria-selected={adminSection === 'comments'} onClick={() => setAdminSection('comments')}>Beiträge prüfen <strong>{openComments.length}</strong></button>
              {canManageMembers && <button className={adminSection === 'members' ? 'active' : ''} type="button" role="tab" aria-selected={adminSection === 'members'} onClick={() => { setAdminSection('members'); if (members.length === 0) void loadMembers(); }}>Mitgliederverwaltung <strong>{members.length}</strong></button>}
              {canManageMembers && <button className={adminSection === 'newsletter' ? 'active' : ''} type="button" role="tab" aria-selected={adminSection === 'newsletter'} onClick={() => setAdminSection('newsletter')}>Newsletter <strong>{members.filter((member) => member.newsletterSubscribed).length}</strong></button>}
              <button className={adminSection === 'notifications' ? 'active' : ''} type="button" role="tab" aria-selected={adminSection === 'notifications'} onClick={() => setAdminSection('notifications')}>E-Mail-Einstellungen</button>
              <button className={adminSection === 'chat' ? 'active' : ''} type="button" role="tab" aria-selected={adminSection === 'chat'} onClick={() => setAdminSection('chat')}>Team-Chat</button>
            </div>
            {adminSection === 'chat' ? <StaffChatPanel csrfToken={csrfToken} context="admin" /> : adminSection === 'notifications' ? <AdminNotificationPanel csrfToken={csrfToken} canManageRegistration={adminRole === 'admin'} onNotice={setNotice} onError={setError} /> : adminSection === 'members' && canManageMembers ? <AdminMembersPanel members={members} csrfToken={csrfToken} onMembersChange={(updater) => setMembers(updater)} onNotice={setNotice} onError={setError} /> : adminSection === 'newsletter' && canManageMembers ? <AdminNewsletterPanel members={members} csrfToken={csrfToken} onNotice={setNotice} onError={setError} /> : <>
            <div className="admin-filter-tabs" role="tablist" aria-label="Beiträge filtern">
              <button className={adminFilter === 'all' ? 'active' : ''} type="button" role="tab" aria-selected={adminFilter === 'all'} onClick={() => setAdminFilter('all')}>Alle <strong>{openComments.length}</strong></button>
              <button className={adminFilter === 'wiki' ? 'active' : ''} type="button" role="tab" aria-selected={adminFilter === 'wiki'} onClick={() => setAdminFilter('wiki')}>Wiki <strong>{wikiSuggestions.length}</strong></button>
              <button className={adminFilter === 'comments' ? 'active' : ''} type="button" role="tab" aria-selected={adminFilter === 'comments'} onClick={() => setAdminFilter('comments')}>Kommentare <strong>{experienceComments.length}</strong></button>
              <button className={adminFilter === 'requests' ? 'active' : ''} type="button" role="tab" aria-selected={adminFilter === 'requests'} onClick={() => setAdminFilter('requests')}>Reparatur <strong>{repairRequests.length}</strong></button>
            </div>
            <div className="admin-search card-doodle">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <span className="sr-only">Beiträge durchsuchen</span>
                <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="z. B. Akku, Bonfire, alex, Fehlerbild …" />
              </label>
              <span className="admin-search-count">{adminSearch.trim() ? `${filteredComments.length} Treffer` : `${visibleComments.length} angezeigt`}</span>
            </div>
            <div className="admin-comment-list">
              {filteredComments.length ? filteredComments.map((comment) => (
                <article className={`admin-comment card-doodle ${comment.status === 'pending' ? 'admin-comment-pending' : ''}`} key={comment.id}>
                  <div className="admin-comment-header">
                    <div><span className={`admin-status ${comment.status}`}>{comment.status === 'pending' ? 'wartet auf Prüfung' : 'freigegeben'}</span><span className="admin-kind">{comment.kind === 'wiki_suggestion' ? 'Wiki-Vorschlag' : comment.kind === 'repair_request' ? 'Reparaturanfrage' : comment.kind === 'repair_answer' ? 'Antwort auf Reparaturanfrage' : 'Erfahrungsbericht'}</span><h2>{comment.topic ?? comment.name}</h2><p>{comment.topic ? `${comment.name} · ` : ''}{comment.email} · {comment.guide} · {new Date(comment.createdAt).toLocaleString('de-DE')}</p>{comment.section && <p className="admin-comment-target"><strong>Modell / Bereich:</strong> „{comment.section}“</p>}{comment.kind === 'repair_answer' && comment.parentId && <p className="admin-comment-target"><strong>Antwort auf Anfrage:</strong> {comment.parentId}</p>}</div>
                    <div className="admin-comment-actions">
                      {comment.status === 'pending' ? <button className="button button-ink" type="button" disabled={busy} onClick={() => void handleStatus(comment, 'approved')}>Freigeben</button> : <button className="button button-ghost" type="button" disabled={busy} onClick={() => void handleStatus(comment, 'pending')}>Zurückstellen</button>}
                      {comment.kind === 'repair_request' && <button className="button button-ghost" type="button" onClick={() => handleRepairDraftDownload(comment)}>Als neue Hilfe vorbereiten</button>}
                      <button className="button button-danger" type="button" disabled={busy} onClick={() => void handleDelete(comment)}>Löschen</button>
                    </div>
                  </div>
                  <p className="admin-comment-body">{comment.body}</p>
                  {comment.source && <p className="admin-comment-source"><strong>Quelle:</strong> {comment.source}</p>}
                  {comment.imageUrl && <a href={comment.imageUrl} target="_blank" rel="noreferrer"><img className="admin-comment-image" src={comment.imageUrl} alt={`Anhang von ${comment.name}`} /></a>}
                </article>
              )) : <div className="admin-empty card-doodle"><h2>{adminSearch.trim() ? 'Nichts gefunden.' : 'Alles ruhig.'}</h2><p>{adminSearch.trim() ? 'Versuch es mit einem anderen Suchbegriff.' : adminFilter === 'wiki' ? 'Aktuell liegen keine Wiki-Vorschläge zur Prüfung vor.' : adminFilter === 'comments' ? 'Aktuell liegen keine Erfahrungsberichte zur Prüfung vor.' : adminFilter === 'requests' ? 'Aktuell liegen keine Reparaturanfragen oder Antworten zur Prüfung vor.' : 'Aktuell liegen keine offenen Beiträge zur Prüfung vor.'}</p></div>}
            </div>
            </>}
          </section>
        )}
      </main>
      <GuideFooter />
    </div>
  );
}

function AdminNotificationPanel({ csrfToken, canManageRegistration, onNotice, onError }: {
  csrfToken: string;
  canManageRegistration: boolean;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [settings, setSettings] = useState<AdminNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiJson<{ settings: AdminNotificationSettings }>('/api/admin/notification-settings')
      .then((payload) => {
        if (active) setSettings(payload.settings);
      })
      .catch((loadError) => {
        if (active) onError(loadError instanceof Error ? loadError.message : 'E-Mail-Einstellungen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onError]);

  const updateSetting = (key: keyof AdminNotificationSettings, value: boolean) => {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    try {
      const response = await apiJson<{ settings: AdminNotificationSettings; message: string }>('/api/admin/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ settings }),
      });
      setSettings(response.settings);
      onNotice(response.message);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'E-Mail-Einstellungen konnten nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const options: Array<{ key: keyof AdminNotificationSettings; title: string; description: string }> = [
    { key: 'comments', title: 'Neue Kommentare', description: 'Erfahrungsberichte, Hinweise und Ergänzungen zur Prüfung.' },
    { key: 'wiki', title: 'Neue Wiki-Vorschläge', description: 'Vorschläge für technische Wiki-Seiten und bestehende Abschnitte.' },
    { key: 'repair', title: 'Neue Reparaturbeiträge', description: 'Reparaturanfragen und Antworten aus der Community.' },
    { key: 'bugs', title: 'Neue Bugmeldungen', description: 'Bestätigte Fehlerberichte, die als GitHub-Issue angelegt wurden.' },
  ];

  return (
    <section className="admin-notification-section">
      <div className="admin-members-heading">
        <div><div className="eyebrow handwritten">dein redaktions-postfach</div><h2>E-Mail-Einstellungen</h2><p>Wähle selbst, bei welchen neuen Vorgängen Mailjet dich informieren soll. Die Einstellungen gelten nur für dein Konto.</p></div>
        <span className="admin-member-count">{canManageRegistration ? 'Admin' : 'Moderator'}</span>
      </div>
      {loading ? <p className="admin-loading">Einstellungen werden geladen …</p> : settings && <form className="admin-notification-form card-doodle" onSubmit={handleSubmit}>
        <div className="admin-notification-list">
          {options.map((option) => <label className="admin-notification-option" key={option.key}>
            <input type="checkbox" checked={settings[option.key]} onChange={(event) => updateSetting(option.key, event.target.checked)} />
            <span><strong>{option.title}</strong><small>{option.description}</small></span>
          </label>)}
        </div>
        {canManageRegistration ? <label className="admin-notification-option admin-notification-registration">
          <input type="checkbox" checked={settings.registration} onChange={(event) => updateSetting('registration', event.target.checked)} />
          <span><strong>Neue Registrierungen</strong><small>Neue Konten, die auf ihre E-Mail-Bestätigung warten.</small></span>
        </label> : <p className="admin-notification-locked"><strong>Neue Registrierungen bleiben beim Admin.</strong><br />Moderatoren erhalten aus Datenschutz- und Zuständigkeitsgründen keine Registrierungs-Mails.</p>}
        <p className="admin-newsletter-note">Ausgeschaltete Kategorien werden serverseitig nicht versendet. Die bestehende Sicherheitsbremse gegen zu viele Mails bleibt aktiv.</p>
        <button className="button button-ink" type="submit" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Einstellungen speichern ↗'}</button>
      </form>}
    </section>
  );
}

function AdminMembersPanel({ members, csrfToken, onMembersChange, onNotice, onError }: {
  members: AdminMember[];
  csrfToken: string;
  onMembersChange: (updater: (current: AdminMember[]) => AdminMember[]) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ type: 'message' | 'warning'; member: AdminMember } | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const normalizedQuery = memberSearch.trim().toLocaleLowerCase('de');
    if (!normalizedQuery) return members;
    return members.filter((member) => `${member.name} ${member.email} ${member.role} ${member.status} ${member.model ?? ''} ${member.newsletterSubscribed ? 'newsletter abonniert' : ''}`.toLocaleLowerCase('de').includes(normalizedQuery));
  }, [memberSearch, members]);

  const openMessageDialog = (member: AdminMember) => {
    setSubject('');
    setBody('');
    setDialog({ type: 'message', member });
  };

  const openWarningDialog = (member: AdminMember) => {
    setReason('');
    setDialog({ type: 'warning', member });
  };

  const handleDialogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog) return;
    setBusy(true);
    try {
      const payload = dialog.type === 'message' ? { subject, body } : { reason };
      const response = await apiJson<{ message: string; member?: AdminMember }>(`/api/admin/users/${dialog.member.id}/${dialog.type === 'message' ? 'message' : 'warning'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(payload),
      });
      const updatedMember = response.member;
      if (updatedMember) {
        onMembersChange((current) => current.map((member) => member.id === updatedMember.id ? updatedMember : member));
      }
      setDialog(null);
      onNotice(response.message);
    } catch (actionError) {
      onError(actionError instanceof Error ? actionError.message : 'Die Aktion konnte nicht durchgeführt werden.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (member: AdminMember) => {
    if (!window.confirm(`Eine Passwort-Zurücksetzungs-Mail an ${member.email} senden?`)) return;
    setBusy(true);
    try {
      const response = await apiJson<{ message: string }>(`/api/admin/users/${member.id}/password-reset`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      onNotice(response.message);
    } catch (actionError) {
      onError(actionError instanceof Error ? actionError.message : 'Die Passwort-Mail konnte nicht versendet werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (member: AdminMember) => {
    if (!window.confirm(`Konto von ${member.name} samt persönlichen Beiträgen wirklich löschen?`)) return;
    setBusy(true);
    try {
      await apiJson<{ deleted: boolean }>(`/api/admin/users/${member.id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      onMembersChange((current) => current.filter((item) => item.id !== member.id));
      onNotice(`Konto von ${member.name} wurde gelöscht.`);
    } catch (actionError) {
      onError(actionError instanceof Error ? actionError.message : 'Das Mitglied konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (member: AdminMember) => {
    const nextRole = member.role === 'moderator' ? 'member' : 'moderator';
    const action = nextRole === 'moderator' ? 'zum Moderator machen' : 'die Moderatorrolle entziehen';
    if (!window.confirm(member.name + ' wirklich ' + action + '?')) return;
    setBusy(true);
    try {
      const response = await apiJson<{ message: string; member: AdminMember }>('/api/admin/users/' + member.id + '/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ role: nextRole }),
      });
      onMembersChange((current) => current.map((item) => item.id === response.member.id ? response.member : item));
      onNotice(response.message);
    } catch (actionError) {
      onError(actionError instanceof Error ? actionError.message : 'Die Moderatorrolle konnte nicht geändert werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-members-section">
      <div className="admin-members-heading">
        <div><div className="eyebrow handwritten">community im blick</div><h2>Mitgliederverwaltung</h2><p>Konten verwalten, persönlich schreiben und Moderationsmaßnahmen nachvollziehbar auslösen.</p></div>
        <span className="admin-member-count">{members.length} Konten</span>
      </div>
      <div className="admin-search card-doodle">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Mitglieder durchsuchen</span>
          <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="z. B. Name, E-Mail, Moderator, Bonfire …" />
        </label>
        <span className="admin-search-count">{memberSearch.trim() ? `${filteredMembers.length} Treffer` : `${members.length} Mitglieder`}</span>
      </div>
      <div className="admin-member-list">
        {filteredMembers.length ? filteredMembers.map((member) => (
          <article className={`admin-member card-doodle ${member.communicationBlocked ? 'admin-member-blocked' : ''}`} key={member.id}>
            <div className="admin-member-topline">
              <div><span className={`admin-status ${member.communicationBlocked ? 'blocked' : member.status === 'active' ? 'approved' : 'pending'}`}>{member.communicationBlocked ? 'Kommunikation gesperrt' : member.status === 'active' ? 'aktiv' : 'E-Mail offen'}</span>{member.role === 'moderator' && <span className="admin-role">Moderator</span>}<h3>{member.name}</h3><p>{member.email}</p></div>
              <span className="admin-warning-count">{member.warningCount}/3 Verwarnungen</span>
            </div>
            <dl className="admin-member-facts"><div><dt>Modell</dt><dd>{member.model ?? 'nicht festgelegt'}</dd></div><div><dt>Registriert</dt><dd>{member.createdAt ? new Date(member.createdAt).toLocaleDateString('de-DE') : '—'}</dd></div><div><dt>Newsletter</dt><dd>{member.newsletterSubscribed ? 'abonniert' : 'nein'}</dd></div></dl>
            {member.warnings.length > 0 && <details className="admin-member-warnings"><summary>Verwarnungen ansehen</summary><ol>{member.warnings.map((warning) => <li key={warning.id}><strong>{new Date(warning.createdAt).toLocaleDateString('de-DE')}</strong> · {warning.reason}</li>)}</ol></details>}
            <div className="admin-member-actions"><button className="button button-ink" type="button" disabled={busy} onClick={() => openMessageDialog(member)}>Mail schreiben</button><button className="button button-ghost" type="button" disabled={busy} onClick={() => void handlePasswordReset(member)}>Reset-Mail senden</button><button className="button button-ghost" type="button" disabled={busy} onClick={() => void handleRoleChange(member)}>{member.role === 'moderator' ? 'Moderator entziehen' : 'Zum Moderator machen'}</button>{!member.communicationBlocked && <button className="button button-ghost" type="button" disabled={busy} onClick={() => openWarningDialog(member)}>Verwarnen</button>}<button className="button button-danger" type="button" disabled={busy} onClick={() => void handleDelete(member)}>Löschen</button></div>
          </article>
        )) : <div className="admin-empty card-doodle"><h2>{memberSearch.trim() ? 'Nichts gefunden.' : 'Noch keine Mitglieder.'}</h2><p>{memberSearch.trim() ? 'Versuch es mit einem anderen Suchbegriff.' : 'Sobald ein Konto bestätigt wurde, erscheint es hier.'}</p></div>}
      </div>
      {dialog && <div className="admin-user-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="admin-user-dialog card-doodle" role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title"><div className="admin-user-dialog-header"><div><div className="eyebrow handwritten">{dialog.type === 'message' ? 'direkter draht' : 'moderation'}</div><h3 id="admin-user-dialog-title">{dialog.type === 'message' ? `Mail an ${dialog.member.name}` : `Verwarnung für ${dialog.member.name}`}</h3></div><button className="bug-report-close" type="button" aria-label="Dialog schließen" onClick={() => setDialog(null)}>×</button></div>{dialog.type === 'message' ? <form className="comment-form" onSubmit={handleDialogSubmit}><label>Betreff<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={2} maxLength={160} required /></label><label>Nachricht<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={2} maxLength={5000} rows={8} required /></label><button className="button button-ink" type="submit" disabled={busy}>{busy ? 'Wird versendet …' : 'Mail senden'} <span aria-hidden="true">↗</span></button></form> : <form className="comment-form" onSubmit={handleDialogSubmit}><p className="admin-user-dialog-warning">Aktueller Stand: {dialog.member.warningCount}/3. Mit der dritten Verwarnung wird die Kommunikation automatisch gesperrt.</p><label>Grund der Verwarnung<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={1000} rows={7} placeholder="Was wurde moderiert?" required /></label><button className="button button-ink" type="submit" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Verwarnung speichern'} <span aria-hidden="true">↗</span></button></form>}</section></div>}
    </section>
  );
}

function AdminNewsletterPanel({ members, csrfToken, onNotice, onError }: {
  members: AdminMember[];
  csrfToken: string;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [subject, setSubject] = useState('Neu bei BTM-Hilfe');
  const [title, setTitle] = useState('Neuigkeiten aus der BTM-Community');
  const [intro, setIntro] = useState('Was sich bei BTM-Hilfe getan hat und was jetzt wichtig ist.');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const subscriberCount = members.filter((member) => member.newsletterSubscribed && member.status === 'active' && !member.communicationBlocked).length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subscriberCount === 0) {
      onError('Aktuell gibt es keine bestätigten Newsletter-Abonnenten.');
      return;
    }
    if (!window.confirm(`Newsletter wirklich an ${subscriberCount} Abonnent${subscriberCount === 1 ? '' : 'en'} senden?`)) return;
    setBusy(true);
    try {
      const response = await apiJson<{ message: string }>('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ subject, title, intro, body }),
      });
      setBody('');
      onNotice(response.message);
    } catch (sendError) {
      onError(sendError instanceof Error ? sendError.message : 'Der Newsletter konnte nicht versendet werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-newsletter-section">
      <div className="admin-members-heading">
        <div><div className="eyebrow handwritten">direkt aus der redaktion</div><h2>Newsletter</h2><p>Schreibe eine hübsche Nachricht an bestätigte Nutzer, die den Newsletter aktiviert haben. Jede Kampagne wird einzeln und mit Abmeldelink verschickt.</p></div>
        <span className="admin-member-count">{subscriberCount} Abonnenten</span>
      </div>
      <div className="admin-newsletter-recipient card-doodle"><strong>{subscriberCount}</strong><span>bestätigte Abonnenten erhalten diese Ausgabe.<br />Gesperrte Konten werden automatisch ausgelassen.</span></div>
      <form className="admin-newsletter-form card-doodle" onSubmit={handleSubmit}>
        <label>Betreff<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={2} maxLength={160} required /></label>
        <label>Überschrift<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} required /></label>
        <label>Vorspann<input value={intro} onChange={(event) => setIntro(event.target.value)} minLength={10} maxLength={500} required /></label>
        <label>Newslettertext<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={8000} rows={10} placeholder="Was möchtest du der Community mitteilen? Zeilenumbrüche bleiben erhalten." required /></label>
        <p className="admin-newsletter-note">Sicherheitsbremse: maximal ein Newsletter alle 15 Minuten. Der Abmeldelink führt direkt in den persönlichen Bereich.</p>
        <button className="button button-ink" type="submit" disabled={busy || subscriberCount === 0}>{busy ? 'Wird versendet …' : subscriberCount === 0 ? 'Keine Abonnenten vorhanden' : 'Newsletter versenden ↗'}</button>
      </form>
    </section>
  );
}

function CommunityPage() {
  useEffect(() => {
    document.title = 'BTM Community-Wissen — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  const communityPdfs = [
    { title: 'Wildfire-Handbuch', detail: '28 Seiten · Bedienung, Sicherheit und Wartung', href: '/pdfs/19-wildfire-handbuch-community.pdf' },
    { title: 'Wildfire-Wartungszusammenfassung', detail: '4 Seiten · Laden und Wartung', href: '/pdfs/20-wildfire-wartung-community.pdf' },
    { title: 'Gabelabdichtung', detail: '6 Seiten · Fehlerspur an der Wildfire-Gabel', href: '/pdfs/21-gabelabdichtung-community.pdf' },
    { title: 'Wildfire FarDriver-Settings', detail: '2 Seiten · Controller-Einstellungen', href: '/pdfs/22-wildfire-fardriver-settings-community.pdf' },
  ];

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="community-page-main">
        <section className="community-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">community-wissen · redaktionell geordnet</div>
          <h1>BTM Community-Wissen</h1>
          <p>Die nützlichen technischen Spuren aus der Community — verständlich zusammengefasst, ohne lange Forenverläufe und mit Originalquelle zum Gegenprüfen.</p>
          <div className="community-source-banner card-doodle">
            <span className="kind-chip community">Quelle</span>
            <p>Die Inhalte sind unabhängige Community-Aufbereitungen. Angaben zu Bremsen, Fahrwerk, Akku, Hochvolt und Controller bitte immer am eigenen Modellstand prüfen.</p>
            <a className="button button-ghost" href="https://btm-community.org/" target="_blank" rel="nofollow noreferrer">BTM Community öffnen ↗</a>
          </div>
        </section>

        <section className="community-knowledge-section section-pad">
          <div className="section-heading">
            <div>
              <div className="eyebrow handwritten">was wir daraus nutzen</div>
              <h2>Die wichtigen Spuren.</h2>
            </div>
            <span className="section-arrow handwritten">kurz erklärt,<br />Quelle dabei →</span>
          </div>
          <div className="community-knowledge-grid">
            {communityKnowledge.map((entry, index) => (
              <article id={slugify(entry.title)} className={`community-knowledge-card card-doodle ${index % 2 === 1 ? 'community-card-tilt-right' : 'community-card-tilt-left'}`} key={entry.title}>
                <div className="community-card-topline"><span className="kind-chip community">{entry.model}</span><span>Zusammenfassung</span></div>
                <h2>{entry.title}</h2>
                <p>{entry.intro}</p>
                <ul>{entry.points.map((point) => <li key={point}>{point}</li>)}</ul>
                <a className="community-source-link" href={entry.sourceHref} target="_blank" rel="nofollow noreferrer">Quelle: {entry.sourceLabel} ↗</a>
              </article>
            ))}
          </div>
        </section>

        <section className="community-pdf-section section-pad">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow handwritten">lokal gesichert</div>
              <h2>Die vier Community-PDFs.</h2>
            </div>
            <a className="button button-ghost" href="/pdfs/index.html">Alle PDFs ↗</a>
          </div>
          <div className="community-pdf-list card-doodle">
            {communityPdfs.map((pdf) => (
              <div className="community-pdf-row" key={pdf.href}>
                <span><strong>{pdf.title}</strong><small>{pdf.detail}</small></span>
                <span className="community-pdf-actions"><a href={pdf.href}>PDF öffnen ↗</a><a href="https://btm-community.org/wildfire/dokumente-wildfire/" target="_blank" rel="nofollow noreferrer">Quelle ↗</a></span>
              </div>
            ))}
          </div>
          <p className="content-note handwritten">Lokale Kopien werden angeboten, damit keine toten Original-Links nötig sind. Rechte und Version vor öffentlicher Weitergabe prüfen.</p>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function PartsPage() {
  const [filter, setFilter] = useState<PartsFilter>('Alle');
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Ersatzteile — Black Tea Motorbikes – Hilfe';
    window.scrollTo(0, 0);
  }, []);

  const filteredParts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return historicalShopParts.filter((part) => {
      const matchesFilter = filter === 'Alle' || part.category === filter;
      const searchable = `${part.title} ${part.category} ${part.model} ${part.variants?.join(' ') ?? ''}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    }).sort((a, b) => {
      const aHasLink = a.purchaseOptions?.length ? 0 : 1;
      const bHasLink = b.purchaseOptions?.length ? 0 : 1;
      return aHasLink - bHasLink || a.title.localeCompare(b.title, 'de', { sensitivity: 'base' });
    });
  }, [filter, query]);

  const categories: PartsFilter[] = ['Alle', 'Bremsen', 'Fahrwerk & Räder', 'Elektrik & Laden', 'Antrieb & Controller', 'Karosserie & Halter', 'Bundles', 'Zubehör'];

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="parts-page-main">
        <section className="parts-page-hero section-pad">
          <a className="repair-back" href="/">← Zur Sammelmappe</a>
          <div className="eyebrow handwritten">historischer katalog · sauber markiert</div>
          <h1>Ersatzteile</h1>
          <p>Hier findest du alle Produkte, die im früheren offiziellen BTM-Shop gelistet waren — als Recherchebasis für Ersatz, Reparatur und Gebrauchtteile.</p>
          <div className="parts-page-facts">
            <div><strong>{historicalShopParts.length}</strong><span>historische Shop-Einträge</span></div>
            <div><strong>7</strong><span>Kategorien</span></div>
            <div><strong>0</strong><span>aktuelle Verfügbarkeitszusagen</span></div>
          </div>
        </section>

        <section className="parts-catalog-section section-pad">
          <div className="toolbar card-doodle parts-page-toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Ersatzteile durchsuchen</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Bremse, Wildfire, Display …" />
            </label>
            <div className="filter-tabs parts-filter-tabs" role="group" aria-label="Ersatzteile filtern">
              {categories.map((item) => (
                <button key={item} className={filter === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter(item)} type="button">
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="parts-catalog-grid">
            {filteredParts.map((part, index) => <PartCard key={part.id} part={part} index={index} />)}
          </div>
          {filteredParts.length === 0 && <div className="empty-state card-doodle">Kein Ersatzteil gefunden. Versuch es mit „Bremse“, „Akku“ oder „Wildfire“.</div>}
          <p className="content-note handwritten">Historische Shop-Daten und Preise immer mit dem lokalen Datensatz, dem Fahrzeug und der Teilenummer gegenprüfen.</p>
          <div className="parts-catalog-note card-doodle">
            <span className="sourcing-badge">lokal gesichert</span>
            <p>Die Liste bildet den historischen Shop-Bestand ab. Produktnamen, Beschreibungen, Varianten und historische Preise liegen lokal in unserem Datensatz. Preise, Lagerbestand und Kaufabwicklung sind nicht mehr aktuell zugesichert; ein Eintrag ist kein Beleg für Kompatibilität.</p>
            <a className="button button-ghost" href={localPartArchiveHref}>Datenquelle ansehen ↗</a>
          </div>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function PartCard({ part, index }: { part: HistoricalShopPart; index: number }) {
  return (
    <article id={part.id} className={`part-catalog-card card-doodle ${index % 3 === 1 ? 'part-catalog-card-tilt-right' : index % 3 === 2 ? 'part-catalog-card-tilt-left' : ''}`}>
      <div className="part-card-topline">
        <span className="kind-chip part">Ersatzteil</span>
        <div className="part-card-statuses">
          <PartAvailabilityBadge part={part} />
          <span className="part-card-category">{part.category}</span>
        </div>
      </div>
      <h2><a href={part.path}>{part.title}</a></h2>
      <div className="part-card-model">{part.model}</div>
      <p>{part.historicalSummary}</p>
      {part.variants && <div className="part-card-variants"><strong>Varianten</strong><span>{part.variants.join(' · ')}</span></div>}
      <div className="part-card-footer">
        <span>{part.price ? `historisch ${part.priceMax && part.priceMax !== part.price ? `${part.price}–${part.priceMax}` : part.price} €` : 'Preis nicht übernommen'}</span>
        <a href={part.path}>Detail öffnen ↗</a>
      </div>
    </article>
  );
}

function PartAvailabilityBadge({ part }: { part: HistoricalShopPart }) {
  if (!part.purchaseOptions?.length) return null;

  return <span className="part-availability-badge" title="Eine Bezugsquelle ist hinterlegt. Passform und technische Daten bitte vor dem Kauf prüfen.">✓ Vorhanden</span>;
}

function PartDetailPage({ part }: { part: HistoricalShopPart }) {
  useEffect(() => {
    document.title = `${part.title} — Ersatzteil — Black Tea Motorbikes – Hilfe`;
    window.scrollTo(0, 0);
  }, [part.title]);

  return (
    <div className="site-shell">
      <GuideHeader />
      <main className="parts-detail-main">
        <section className="parts-detail-hero section-pad">
          <a className="repair-back" href="/ersatzteile">← Alle Ersatzteile</a>
          <div className="eyebrow handwritten">ersatzteil · lokal recherchiert</div>
          <h1>{part.title}</h1>
          <p>{part.historicalSummary}</p>
          <div className="parts-detail-meta">
            <span><strong>Modell</strong>{part.model}</span>
            <span><strong>Kategorie</strong>{part.category}</span>
            <span><strong>Status</strong>{part.safetyClass}</span>
          </div>
        </section>

        <section className="parts-detail-section section-pad">
          <article className="parts-detail-card card-doodle">
            <div className="part-detail-topline"><span className="kind-chip part">Ersatzteil</span><div className="part-detail-topline-status"><PartAvailabilityBadge part={part} /><span>Recherche-Stand: 02.09.2026</span></div></div>

            <div className="part-detail-columns">
              <section>
                <h2>Archivdaten</h2>
                <p>{part.historicalSummary}</p>
                {part.price !== undefined && <div className="part-detail-fact"><strong>{part.priceMax && part.priceMax !== part.price ? `${part.price}–${part.priceMax}` : part.price} €</strong><span>Alter Originalpreis — nicht aktuell</span></div>}
                <p className="part-archive-status"><strong>Archivstatus:</strong> {part.historicalAvailability}{part.archiveTimestamp ? ` · Aufnahme ${part.archiveTimestamp.slice(0, 4)}-${part.archiveTimestamp.slice(4, 6)}-${part.archiveTimestamp.slice(6, 8)}` : ''}</p>
                {part.variants && <div className="part-detail-variants"><strong>{part.variantDetails?.some((variant) => variant.price !== undefined) ? 'Alte Originalpreise' : 'Originalvarianten'}</strong><ul>{part.variantDetails?.length ? part.variantDetails.map((variant) => <li key={variant.label}>{variant.label}{variant.price !== undefined ? ` · ${variant.price} €` : ''}</li>) : part.variants.map((variant) => <li key={variant}>{variant}</li>)}</ul></div>}
                <a className="text-link" href={part.archiveHref}>Lokalen Ersatzteil-Datensatz öffnen ↗</a>
              </section>

              <section className="part-detail-check">
                <div className="eyebrow handwritten">vor dem kauf</div>
                <h2>Passform gegenprüfen</h2>
                <p>{part.compatibilityNote}</p>
                <ul>
                  <li>Modell, Baujahr und genaue Variante notieren.</li>
                  <li>Maße, Stecker, Gewinde und Befestigung vergleichen.</li>
                  <li>Bei Bremsen, Fahrwerk, Akku, Hochvolt oder Controller: Fachbetrieb einbeziehen.</li>
                </ul>
                {part.technicalEvidence && <div className="part-technical-evidence"><strong>{part.technicalEvidence.eyebrow ?? 'Abgleich mit lokaler PDF'}</strong><p>{part.technicalEvidence.text}</p><a href={part.technicalEvidence.href}>{part.technicalEvidence.label} ↗</a></div>}
              </section>
            </div>

              <section className="part-buy-section">
              <div className="eyebrow handwritten">Amazon-Link</div>
              <h2>{part.purchaseOptions?.length ? (part.purchaseHeading ?? `Bezugsquellen für ${part.title}`) : 'Aktuell nichts Passendes gefunden'}</h2>
              {(part.purchaseStatus === 'manual-match' || part.purchaseStatus === 'candidate') && <p className="part-buy-note">{part.purchaseNote}</p>}
              {part.purchaseOptions?.length ? <div className="part-buy-grid">
                {part.purchaseOptions.map((option, optionIndex) => <a key={option.href} className={`part-buy-card ${part.purchaseStatus === 'manual-match' || optionIndex === 0 ? 'amazon' : 'fallback'}`} href={option.href} target="_blank" rel="nofollow noreferrer">
                  <span className="part-buy-label">{part.purchaseStatus === 'manual-match' ? 'Amazon · Handbuchabgleich' : part.purchaseStatus === 'candidate' ? 'Amazon-Link · Passform prüfen' : optionIndex === 0 ? 'Amazon zuerst' : 'Alternative Bezugsquelle'}</span>
                  <strong>{option.label} ↗</strong>
                  <small>{option.fitStatus ?? part.confidence}</small>
                </a>)}
              </div> : <div className="part-no-purchase"><span className="part-buy-label">Noch kein passender Link</span><strong>Momentan haben wir keinen passenden Artikel gefunden.</strong><p>{part.purchaseNote}</p></div>}
            </section>

            <RepairFeedback guideSlug={`ersatzteil-${part.id}`} />
            <RepairComments guideSlug={`ersatzteil-${part.id}`} />

            <div className="parts-detail-source">
              <span className="repair-subhead">Quellenangabe</span>
              <p>Historischer Produktname und die gegebenenfalls übernommenen Varianten stammen aus lokal gesicherten öffentlichen Archivdaten. Die Kaufoptionen sind davon getrennt und müssen vor der Bestellung neu geprüft werden.</p>
            </div>
          </article>
        </section>
      </main>
      <GuideFooter />
    </div>
  );
}

function SourcingCard({ card, index }: { card: SourcingCard; index: number }) {
  return (
    <article className={`sourcing-card card-doodle ${index % 2 === 1 ? 'sourcing-card-tilt-right' : 'sourcing-card-tilt-left'}`}>
      <div className="sourcing-card-topline"><span className="sourcing-category">{card.category}</span><span className="sourcing-status">{card.status}</span></div>
      <h3>{card.title}</h3>
      <p>{card.summary}</p>
      <div className="sourcing-links">
        {card.amazon && <a className="source-action amazon-action" href={card.amazon.href} target="_blank" rel="nofollow noreferrer">{card.amazon.label} ↗</a>}
        {card.fallback && <a className="source-action fallback-action" href={card.fallback.href} target="_blank" rel="nofollow noreferrer">{card.fallback.label} ↗</a>}
      </div>
    </article>
  );
}

function TimelineItem({ date, title, text, sourceHref, sourceLabel }: { date: string; title: string; text: string; sourceHref?: string; sourceLabel?: string }) {
  return <article className="timeline-item"><div className="timeline-date handwritten">{date}</div><div className="timeline-dot" /><div><h3>{title}</h3><p>{text}</p>{sourceHref && <a className="timeline-source" href={sourceHref} target="_blank" rel="nofollow noreferrer">Quelle: {sourceLabel ?? 'Quelle'} ↗</a>}</div></article>;
}
