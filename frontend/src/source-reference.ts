export type SourceKind =
  | 'archive'
  | 'official'
  | 'manual'
  | 'community'
  | 'forum'
  | 'manufacturer'
  | 'marketplace'
  | 'reference'
  | 'legal'
  | 'unknown';

export type SourceReference = {
  href: string;
  label: string;
  kind: SourceKind;
  status?: string;
  checkedAt?: string;
  rights?: string;
};

export function sourceKindFromType(value: unknown): SourceKind {
  const type = typeof value === 'string' ? value.toLocaleLowerCase('de') : '';
  if (type.includes('archive') || type.includes('wayback')) return 'archive';
  if (type.includes('official') || type.includes('manufacturer') || type.includes('oem')) return 'official';
  if (type.includes('manual') || type.includes('handbook')) return 'manual';
  if (type.includes('community')) return 'community';
  if (type.includes('forum')) return 'forum';
  if (type.includes('marketplace') || type.includes('amazon') || type.includes('aliexpress')) return 'marketplace';
  if (type.includes('reference') || type.includes('catalog')) return 'reference';
  if (type.includes('legal')) return 'legal';
  return 'unknown';
}

export function sourceKindLabel(kind: SourceKind): string {
  return {
    archive: 'Archiv',
    official: 'Hersteller-/Originalquelle',
    manual: 'Handbuch',
    community: 'Community',
    forum: 'Forum',
    manufacturer: 'Herstellerdaten',
    marketplace: 'Marktplatz',
    reference: 'Referenz',
    legal: 'Rechtsquelle',
    unknown: 'Quelle',
  }[kind];
}
