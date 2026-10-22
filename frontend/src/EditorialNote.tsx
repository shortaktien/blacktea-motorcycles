import editorial from '../../content/editorial.json';

export const editorialPublisher = editorial;
export const formatEditorialDate = (value: string) => value.split('-').reverse().join('.');

export function EditorialNote({ updatedAt, sourceCheckedAt }: { updatedAt?: string; sourceCheckedAt?: string }) {
  return <aside className="editorial-note" aria-label="Verantwortlichkeit und Quellenstand">
    <p>Herausgeber: <a href={editorial.publisherPath}>{editorial.publisherName}</a> · Unabhängiges Projekt für Black-Tea-Besitzer.</p>
    {sourceCheckedAt && <p>Letzter dokumentierter Quellenabgleich: <time dateTime={sourceCheckedAt}>{formatEditorialDate(sourceCheckedAt)}</time>.</p>}
    {updatedAt && <p>Aufbereitung überarbeitet: <time dateTime={updatedAt}>{formatEditorialDate(updatedAt)}</time>. Das Datum bezeichnet keine erneute Bestätigung aller Quellen.</p>}
    <a href={editorial.methodPath}>So ordnen wir Quellen und Hinweise ein ↗</a>
  </aside>;
}
