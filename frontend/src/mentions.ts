export type UserMention = { name: string; id: string };
// Display only: persisted names and form values never include this prefix.
export function formatUserHandle(name: string): string {
  return `@${name.replace(/^@+/, '')}`;
}
export type MentionPart = { text: string; profileId?: string };
export type UserTextPart = MentionPart & { href?: string; isUrl?: boolean };

export type MentionQuery = { start: number; end: number; query: string };
export function getMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const match = /(?<![\p{L}\p{N}_@./:+-])@([a-z0-9äöüß]{1,80})$/iu.exec(before);
  if (!match) return null;
  const token = before.slice(0, match.index).split(/\s/).pop() ?? '';
  if (/[/:@]/.test(token)) return null;
  const suffix = /^[a-z0-9äöüß]*/iu.exec(text.slice(caret))?.[0] ?? '';
  return { start: match.index, end: caret + suffix.length, query: match[1].toLocaleLowerCase('de') };
}

export function insertMention(text: string, query: MentionQuery, name: string): { text: string; caret: number } {
  const after = text.slice(query.end);
  const handle = formatUserHandle(name) + (/^[\s.,!?;:)}\]]/.test(after) ? '' : ' ');
  return { text: text.slice(0, query.start) + handle + after, caret: query.start + handle.length };
}

// URLs are tokenized before mentions, so an @name inside a URL stays literal.
// No Markdown or HTML from user content is interpreted.
export function splitUserText(text: string, mentions: UserMention[] = [], origins: string[] = []): UserTextPart[] {
  const allowedOrigins = new Set(origins.map((origin) => new URL(origin).origin));
  const base = origins[0];
  const pattern = /(^|[\s([{])((?:[a-z][a-z0-9+.-]*:|(?:[\p{L}\p{N}-]+\.)+[a-z]{2,}|\/)[^\s<>"'`]*)/gimu;
  const parts: UserTextPart[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index + match[1].length;
    let candidate = match[2];
    // Sentence punctuation is not part of the destination. Keep balanced URL parentheses.
    while (candidate) {
      const last = candidate.slice(-1);
      const opening = { ')': '(', ']': '[', '}': '{' }[last];
      if (/[.,;:!?]/.test(last) || (opening && candidate.split(last).length > candidate.split(opening).length)) {
        candidate = candidate.slice(0, -1);
      } else break;
    }
    if (!candidate) continue;
    parts.push(...splitMentions(text.slice(end, start), mentions));
    let href: string | undefined;
    // Reject credentials, backslashes and network-path references, even for our host.
    if (base && !/[\\\u0000-\u001f\u007f]/.test(candidate) && !candidate.startsWith('//')) {
      try {
        const relative = candidate.startsWith('/');
        const input = relative || /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
        const url = new URL(input, base);
        if (['https:', 'http:'].includes(url.protocol) && allowedOrigins.has(url.origin) && !url.username && !url.password) {
          // Keep relative links on the current site, but never emit a network-path href.
          href = relative && !url.pathname.startsWith('//') ? `${url.pathname}${url.search}${url.hash}` : url.href;
        }
      } catch { /* Invalid URLs remain ordinary text. */ }
    }
    parts.push({ text: candidate, isUrl: true, href });
    end = start + candidate.length;
  }
  parts.push(...splitMentions(text.slice(end), mentions));
  return parts;
}

export function splitMentions(text: string, mentions: UserMention[] = []): MentionPart[] {
  const pattern = /(?<![\p{L}\p{N}_@./:+-])@([a-z0-9äöüß]{2,80})(?![\p{L}\p{N}_@-])/giu;
  const known = new Map(mentions.filter((mention) => /^[a-f0-9]{32}$/.test(mention.id)).map((mention) => [mention.name.toLocaleLowerCase('de'), mention.id]));
  const parts: MentionPart[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > end) parts.push({ text: text.slice(end, match.index) });
    parts.push({ text: match[0], profileId: known.get(match[1].toLocaleLowerCase('de')) });
    end = match.index + match[0].length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
}
