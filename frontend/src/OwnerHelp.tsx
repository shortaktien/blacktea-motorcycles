import { useId, useState } from 'react';
import ownerHelp from '../../content/owner-help.json';

export const ownerHelpPages = ownerHelp.pages;
export type OwnerHelpPageData = (typeof ownerHelpPages)[number];

export function OwnerHelpLinks() {
  return <nav className="owner-help-links" aria-label="Hilfe für BTM-Besitzer">
    <a href="/insolvenz">Insolvenz: deine nächsten Schritte ↗</a>
    <a href="/hilfe/ersatzteil-finden">Ersatzteile richtig zuordnen ↗</a>
    <a href="/hilfe/werkstatt-vorbereiten">Reparatur-Steckbrief erstellen ↗</a>
  </nav>;
}

export function OwnerHelpContent({ page }: { page: OwnerHelpPageData }) {
  return <main className="owner-help-main">
    <section className="repair-page-hero section-pad">
      <a className="repair-back" href="/">← Zur Startseite</a>
      <div className="eyebrow handwritten">bonfire &amp; wildfire · hilfe für besitzer</div>
      <h1>{page.heading}</h1>
      <p>{page.intro}</p>
      <p className="wiki-last-updated">Redaktionell bearbeitet: <time dateTime={page.reviewedAt}>{page.reviewedAt.split('-').reverse().join('.')}</time></p>
    </section>
    <div className="owner-help-body section-pad">
      <aside className="owner-help-summary card-doodle" aria-label="Das Wichtigste"><p>{page.summary}</p></aside>
      <nav className="owner-help-toc" aria-label="Auf dieser Seite">
        {page.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        {page.tool && <a href="#steckbrief">Deinen Steckbrief erstellen</a>}
      </nav>
      {page.sections.map((section) => <section className="owner-help-section" id={section.id} key={section.id}>
        <h2>{section.title}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <ul>{section.links.map((link) => <li key={link.href}><a href={link.href}>{link.label} ↗</a></li>)}</ul>
      </section>)}
      {page.tool && <RepairBrief />}
      <p className="owner-help-editorial">Eigene redaktionelle Orientierung von BTM-Hilfe. Quellen und weiterführende Unterlagen stehen beim jeweiligen Abschnitt. Herstellerunterlagen und fremde Beiträge behalten ihren eigenen Rechte- und Versionsstand. Rechtliche Fragen zum Einzelfall gehören in eine unabhängige Beratung.</p>
      <OwnerHelpLinks />
    </div>
  </main>;
}

export function RepairBrief({ partTitle = '', model = '', sourcePath = '' }: { partTitle?: string; model?: string; sourcePath?: string }) {
  const id = useId();
  const [fields, setFields] = useState({ model, year: '', component: partTitle, symptom: '', circumstances: '', tried: '' });
  const [notice, setNotice] = useState('');
  const field = (name: keyof typeof fields, label: string, multiline = false) => <label htmlFor={`${id}-${name}`}>
    {label}
    {multiline ? <textarea id={`${id}-${name}`} value={fields[name]} maxLength={2000} rows={3} onChange={(event) => update(name, event.target.value)} />
      : <input id={`${id}-${name}`} value={fields[name]} maxLength={160} onChange={(event) => update(name, event.target.value)} />}
  </label>;
  const update = (name: keyof typeof fields, value: string) => { setFields((previous) => ({ ...previous, [name]: value })); setNotice(''); };
  const text = [
    partTitle ? `Teileanfrage: ${partTitle}` : 'Reparaturanfrage: Black Tea Motorbikes',
    `Modell / Variante: ${fields.model.trim() || '[bitte ergänzen]'}`,
    `Baujahr: ${fields.year.trim() || '[unbekannt / bitte ergänzen]'}`,
    `Bauteil / Bezeichnung: ${fields.component.trim() || '[bitte ergänzen]'}`,
    `Beobachtung / Fehlercode: ${fields.symptom.trim() || '[bitte ergänzen]'}`,
    `Wann tritt es auf? ${fields.circumstances.trim() || '[bitte ergänzen]'}`,
    `Bisherige Maßnahmen: ${fields.tried.trim() || '[keine angegeben]'}`,
    ...(sourcePath ? [`Katalogeintrag: ${sourcePath}`] : []),
    '',
    'Können Sie dieses Modell und Bauteil prüfen? Welche Angaben fehlen Ihnen?',
    'Bitte klären Sie mit mir Diagnosekosten, Teilebeschaffung und gegebenenfalls Transport vor einer Beauftragung.',
    'Diese Anfrage enthält Beobachtungen, keine bestätigte Diagnose oder Freigabe.',
  ].join('\n');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNotice('Steckbrief kopiert. Du kannst ihn jetzt selbst weitergeben.'); }
    catch { setNotice('Kopieren nicht verfügbar. Markiere den Text in der Vorschau oder lade die Textdatei herunter.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'btm-reparatur-steckbrief.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Textdatei erstellt. Bewahre sie bei deinen Fahrzeugunterlagen auf.');
  };
  return <section className="repair-brief card-doodle" id="steckbrief" aria-labelledby={`${id}-title`}>
    <div className="eyebrow handwritten">vorbereiten · kopieren · selbst weitergeben</div>
    <h2 id={`${id}-title`}>{partTitle ? `Teileanfrage für ${partTitle}` : 'Dein Reparatur-Steckbrief'}</h2>
    <p>Die Eingaben bleiben in dieser geöffneten Seite und gehen beim Neuladen verloren. Kopiere oder lade deinen Steckbrief herunter. Es wird nichts versendet. Bitte keine vollständige FIN, Adresse oder Zahlungsdaten eintragen.</p>
    <div className="repair-brief-fields">
      {field('model', 'Modell und Variante')}{field('year', 'Baujahr (falls bekannt)')}
      {field('component', 'Bauteil oder Teilenummer')}{field('symptom', 'Beobachtung und Fehlercode', true)}
      {field('circumstances', 'Wann und unter welchen Umständen?', true)}{field('tried', 'Was wurde bereits gemacht?', true)}
    </div>
    <label className="repair-brief-preview" htmlFor={`${id}-preview`}>Vorschau zum Kopieren<textarea id={`${id}-preview`} value={text} readOnly rows={12} /></label>
    <div className="hero-actions"><button className="button button-ink" type="button" onClick={copy}>Steckbrief kopieren</button><button className="button button-ghost" type="button" onClick={download}>Als Textdatei herunterladen</button></div>
    <p className="repair-brief-notice" role="status">{notice}</p>
    <a href="/werkstaetten">Passende Werkstatt suchen ↗</a>
  </section>;
}
