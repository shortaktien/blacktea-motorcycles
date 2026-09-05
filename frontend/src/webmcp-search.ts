export type WebMcpScope = 'all' | 'faq' | 'wiki' | 'repair' | 'pdf' | 'owner' | 'part';

export type WebMcpKnowledgeEntry = {
  kind: Exclude<WebMcpScope, 'all'>;
  title: string;
  text: string;
  href: string;
};

function normalizeWebMcpText(value: string): string {
  return value.toLocaleLowerCase('de').normalize('NFKC');
}

export function cleanWebMcpText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWebMcpQueryTerms(query: string): string[] {
  return normalizeWebMcpText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1);
}

function webMcpSearchText(entry: WebMcpKnowledgeEntry): string {
  return normalizeWebMcpText(`${entry.title} ${entry.text}`);
}

function webMcpMatches(entry: WebMcpKnowledgeEntry, query: string): boolean {
  const searchText = webMcpSearchText(entry);
  const normalizedQuery = normalizeWebMcpText(query);
  if (searchText.includes(normalizedQuery)) return true;

  const terms = getWebMcpQueryTerms(query);
  return terms.length > 0 && terms.every((term) => searchText.includes(term));
}

export function webMcpExcerpt(text: string, query: string): string {
  const cleaned = cleanWebMcpText(text);
  const lowerText = normalizeWebMcpText(cleaned);
  const normalizedQuery = normalizeWebMcpText(query);
  const queryTerms = getWebMcpQueryTerms(query);
  const matchedTerm = queryTerms.find((term) => lowerText.includes(term));
  const matchIndex = lowerText.indexOf(normalizedQuery) >= 0
    ? lowerText.indexOf(normalizedQuery)
    : matchedTerm ? lowerText.indexOf(matchedTerm) : -1;
  const matchLength = matchIndex >= 0 && lowerText.slice(matchIndex, matchIndex + normalizedQuery.length) === normalizedQuery
    ? query.length
    : matchedTerm?.length ?? query.length;

  if (matchIndex < 0) return `${cleaned.slice(0, 180)}${cleaned.length > 180 ? ' …' : ''}`;

  const start = Math.max(0, matchIndex - 55);
  const end = Math.min(cleaned.length, matchIndex + matchLength + 125);
  return `${start > 0 ? '…' : ''}${cleaned.slice(start, end)}${end < cleaned.length ? ' …' : ''}`;
}

export function searchBtmKnowledge(
  entries: WebMcpKnowledgeEntry[],
  siteOrigin: string,
  queryValue: unknown,
  scopeValue: unknown,
): string {
  const query = typeof queryValue === 'string' ? queryValue.trim().slice(0, 120) : '';
  const requestedScope = typeof scopeValue === 'string' ? scopeValue : 'all';
  const scope: WebMcpScope = ['all', 'faq', 'wiki', 'repair', 'pdf', 'owner', 'part'].includes(requestedScope)
    ? requestedScope as WebMcpScope
    : 'all';

  if (!query) {
    return JSON.stringify({ ok: false, message: 'Bitte gib einen Suchbegriff für FAQ, Wiki, PDFs oder Reparaturhilfe an.' });
  }

  const matches = entries.filter((entry) => {
    if (scope !== 'all' && entry.kind !== scope) return false;
    return webMcpMatches(entry, query);
  });
  const results = matches.slice(0, 4).map((entry) => ({
    type: entry.kind,
    title: entry.title,
    excerpt: webMcpExcerpt(entry.text, query),
    url: `${siteOrigin}${entry.href}`,
  }));

  return JSON.stringify({
    ok: true,
    query,
    scope,
    resultCount: matches.length,
    truncated: matches.length > results.length,
    results,
  });
}
