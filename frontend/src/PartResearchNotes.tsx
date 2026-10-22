import reviewNotes from '../../content/part-review-notes.json';

export function PartResearchNotes({ slug }: { slug: string }) {
  const note = (reviewNotes as Record<string, { summary: string; needed: string[] }>)[slug];
  if (!note) return null;
  return <section className="part-research-notes" aria-labelledby={`research-notes-${slug}`}>
    <h2 id={`research-notes-${slug}`}>Was für die Zuordnung noch fehlt</h2>
    <p>{note.summary}</p>
    <ul>{note.needed.map((item) => <li key={item}>{item}</li>)}</ul>
    <p>Diese Angaben sind offene Recherchefragen, keine Einbaufreigabe. Mit <a href="#steckbrief">deiner Teileanfrage</a> kannst du sie bei einem Anbieter oder Fachbetrieb gezielt abklären.</p>
  </section>;
}
