import { useEffect, useMemo, useState, type ReactNode } from 'react';
import faq from '../../content/faq.json';
import { EditorialNote } from './EditorialNote';

type HighlightText = (value: string, query: string, keyPrefix: string) => ReactNode;

export function FaqContent({ highlightText }: { highlightText: HighlightText }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = faq.pageTitle;
    const revealAnswer = () => {
      const answer = document.getElementById(window.location.hash.slice(1));
      if (answer instanceof HTMLDetailsElement) {
        answer.open = true;
      }
      answer?.scrollIntoView({ block: 'start' });
    };
    if (window.location.hash) revealAnswer();
    else window.scrollTo(0, 0);
    window.addEventListener('hashchange', revealAnswer);
    return () => window.removeEventListener('hashchange', revealAnswer);
  }, []);

  const items = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('de');
    return faq.items.filter((item) => !term || [item.question, item.answer, item.sourceLabel ?? ''].some((value) => value.toLocaleLowerCase('de').includes(term)));
  }, [query]);

  return <main className="repair-page-main faq-page-main">
    <section className="repair-page-hero faq-page-hero section-pad">
      <a className="repair-back" href="/">← Zur Sammelmappe</a>
      <div className="eyebrow handwritten">antworten für besitzer und besteller</div>
      <h1>Black Tea: Fragen zu Insolvenz, Ersatzteilen und deinem Bike.</h1>
      <p>Wähle dein Anliegen: eine offene Bestellung klären, ein Ersatzteil zuordnen oder Unterlagen für dein Motorrad finden. Jede Antwort führt zur passenden Quelle oder ausführlichen Hilfe.</p>
      <EditorialNote updatedAt={faq.updatedAt} sourceCheckedAt={faq.lastUpdated} />
    </section>
    <section className="faq-section section-pad" aria-label="Fragen und Antworten">
      <nav className="faq-topics" aria-label="FAQ nach Anliegen">
        {faq.groups.map((group) => <a key={group.id} href={`#${group.id}`}>{group.title} ↓</a>)}
      </nav>
      <div className="faq-search card-doodle">
        <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">FAQ durchsuchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Insolvenz, Wildfire, PayPal, Akku …" /></label>
        <span className="faq-search-count" role="status">{query.trim() ? `${items.length} Treffer` : `${items.length} Fragen`}</span>
      </div>
      {faq.groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        return <section className="faq-topic" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
          <h2 id={`${group.id}-title`}>{group.title}</h2>
          <p>{group.intro}</p>
          <div className="faq-list">
            {groupItems.map((item) => <details className="faq-item card-doodle" id={item.id} key={item.id}>
              <summary>{highlightText(item.question, query, `faq-question-${item.id}`)}</summary>
              <div className="faq-answer">
                <p>{highlightText(item.answer, query, `faq-answer-${item.id}`)}</p>
                <a href={item.linkHref}>{item.linkLabel} ↗</a><a className="faq-source-link" href={`/faq#${item.id}`}>Direktlink zu dieser Antwort</a>
                {item.sourceHref && <a className="faq-source-link" href={item.sourceHref} target="_blank" rel="nofollow noreferrer">{item.sourceLabel ?? 'Quelle öffnen'} ↗</a>}
              </div>
            </details>)}
          </div>
          {query.trim() && !groupItems.length && <p className="content-note">Keine Treffer in diesem Bereich.</p>}
        </section>;
      })}
      {items.length === 0 && <p className="empty-state card-doodle">Nichts gefunden. Versuch es mit „Insolvenz“, „Wildfire“, „PayPal“ oder „Akku“.</p>}
    </section>
  </main>;
}
