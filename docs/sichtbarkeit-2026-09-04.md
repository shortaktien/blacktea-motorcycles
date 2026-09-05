# Sichtbarkeit und Besitzerhilfe – 4. September 2026

## Beobachtung

Die Google-Abfrage `site:btm.shortaktien.de` zeigte in der Browser-Stichprobe sechs Ergebnisse: `/faq`, `/ersatzteile`, `/bikes/wildfire`, `/bikes/bonfire`, `/ersatzteile/display` und `/hilfe/akku-bms`. Das ist ein Nachweis erster Indexierung, keine vollständige Indexabdeckung und keine Messung von Positionen für normale Suchanfragen. Die Reihenfolge einer Site-Abfrage ist kein Rankingbericht. GSC wurde nicht ausgewertet.

Die ergänzende Websuche zu „Black Tea Motorbikes Insolvenz Hilfe Ersatzteile“ lieferte vor allem Hersteller-, Nachrichten- und Forumseinträge. Eine belastbare Rankingposition dieser Website lässt sich daraus nicht ableiten. Der inhaltliche Ansatz ist deshalb konkrete Hilfe für Besitzer und Besteller: Dokumente erhalten, Teile identifizieren, Reparaturen vorbereiten und Zuständigkeiten verstehen.

## Lokal umgesetzt

- Drei inhaltlich unterschiedliche, vorgerenderte Leitfäden: `/insolvenz`, `/hilfe/werkstatt-vorbereiten` und `/hilfe/ersatzteil-finden`. Gemeinsame Inhaltsquelle ist `content/owner-help.json`.
- Reparatur-Steckbrief ohne Konto, Serverübertragung oder dauerhafte Speicherung: editierbare Angaben, kopierbare Vorschau und Textdownload. Die 106 Ersatzteilseiten übernehmen Teilenamen, dokumentierten Modellbezug und Kataloglink. Besucher müssen ihre konkrete Variante ergänzen.
- Startseite und Reparatureinstieg auf die Bedürfnisse von Bonfire-/Wildfire-Besitzern ausgerichtet. Navigation und kontextuelle Links führen zu den neuen Hilfen.
- FAQ auf 17 relevante Fragen konzentriert. Allgemeine Markenrankings, „schnellster 125er“ und wenig hilfreiche Preisantworten entfernt. Reichweitenfragen auf die Modellunterlagen gebündelt. Jede Antwort besitzt eine stabile, beim Aufruf geöffnete Adresse.
- Interne Suche und WebMCP durchsuchen auch Besitzerhilfe und Ersatzteile. FAQ-Suchergebnisse verweisen auf die Antwort statt unmittelbar auf eine externe Quelle.
- Titel, Description und JSON-LD werden beim Prerendern aus demselben Resolver wie im Browser bezogen. Seitenentitäten, Breadcrumbs, FAQ-Antworten und Canonicals stimmen damit überein. Die lokale Vite-Vorschau liefert auch ohne abschließenden Schrägstrich das jeweilige HTML aus.
- Sitemap, beide vollständigen LLM-Indizes und Open-Knowledge-Manifest enthalten die neuen Leitfäden; die ausführlichen Indizes enthalten auch Antworttexte. Quellenketten der Reparaturhilfen ergänzt. Prüfdatum und Quellen von Ersatzteilen richten sich nach dem jeweiligen Datensatz statt pauschal nach dem Datum der Beschaffungsrichtlinie.

## Quellen und redaktionelle Grenzen

Die [eingesehene Sekundärquelle](https://www.versteigerungskalender.de/insolvenzkalender/blaeck-tea-motorbikes-gmbh) dokumentiert Sicherungsmaßnahmen vom 14.07.2026, Amtsgericht München, 1513 IN 2588/26. Die frühere Chronikstation „01.09.2026: Verfahrensstand erneut veröffentlicht“ ließ sich dort nicht belegen und wurde entfernt. Für den 16.07.2026 wird nun der tatsächliche [Nachrichtenbeitrag von Scooterhelden](https://scooterhelden.de/2026/07/16/black-tea-motorbikes-insolvent-was-passiert-jetzt-mit-bonfire-und-wildfire/) verlinkt.

Ein neuer Eröffnungsbeschluss wurde nicht amtlich verifiziert. Die Website erklärt diese Grenze und verweist auf das [amtliche Insolvenzportal](https://www.insolvenzbekanntmachungen.de/). Eine redaktionelle Bearbeitung am 04.09.2026 ist keine amtliche Bestätigung des aktuellen Verfahrensstands.

Allgemeine Verbraucherhinweise wurden mit der [Verbraucherzentrale zu Firmeninsolvenzen](https://www.verbraucherzentrale.de/wissen/vertraege-reklamation/kundenrechte/wenn-eine-firma-insolvent-wird-das-sind-ihre-rechte-10630), ihrer [Erklärung zu Gewährleistung und Garantie](https://www.verbraucherzentrale.de/wissen/vertraege-reklamation/kundenrechte/alles-zu-gewaehrleistung-und-schadenersatz-5057), [§ 28 InsO](https://www.gesetze-im-internet.de/inso/__28.html) und [§ 174 InsO](https://www.gesetze-im-internet.de/inso/__174.html) abgeglichen. Individuelle Forderungen, Lieferzusagen oder Zahlungsentscheidungen werden nicht bewertet.

## Prüfung

- Produktionsbuild inklusive TypeScript und Prerendering.
- Bestehende Prüfungen: SEO, pSEO, Content-Policy, Teile, WebMCP und Bildauslieferung.
- Neuer `npm run check:owner-help`: Metadatenparität für 138 indexierbare HTML-Routen, drei Leitfäden, interne Zielseiten und Abschnittslinks, 17 FAQ-Anker, vier Suchintentionen mit dem echten Suchindex und Schutz der Profil-Auslieferung. Auch im Content-Quality-Workflow eingebunden.
- Gegen die lokale HTTP-Vorschau wurden zusätzlich alle 138 HTML-Routen auf den richtigen Seiteninhalt und Titel geprüft. `check:seo` bestand dabei 1.995 Prüfungen einschließlich HTTP-Zielen.
- Browser: Steckbrief ausfüllen/kopieren, Textdownload auslösen, vorausgefüllte Display-Anfrage, direkt geöffnete FAQ-Antwort sowie Smartphone-Darstellung. Keine neuen React-Hydrierungsfehler nach Korrektur der Vorschau.
- Lighthouse, lokale mobile Labormessung: Startseite Performance 96 / Accessibility 96 / SEO 100; drei neue Leitfäden jeweils 97 / 100 / 100; Display-Seite und FAQ jeweils 97 / 96 / 100. Diese Werte sind keine Felddaten. Die lokale Vorschau hatte kein erreichbares Backend; Konten und produktive Community-Daten wurden nicht getestet oder geändert.
- Bekannte Build-Warnung: Das bestehende gemeinsame JavaScript-Bundle überschreitet 500 kB. Die Messungen ersetzen keine spätere Prüfung echter Core Web Vitals.

## Nach einer später ausdrücklich freigegebenen Veröffentlichung

Die drei neuen URLs zuerst per GSC-URL-Prüfung kontrollieren. Danach Impressionen, Klicks und Suchanfragen nach Inhaltstyp vergleichen: Insolvenz-Hilfe, Modell-Wiki, Reparatur und Ersatzteile. Insbesondere Suchbegriffe ohne Domainnamen beobachten. Niedrige Fallzahlen und Änderungen der Suchergebnisse zeitlich einordnen, bevor Titel oder Inhalte erneut geändert werden.

Neue pSEO-Seiten nur bei eigenem Inhalt und belegbarem Nutzen hinzufügen. Die vorhandenen Ersatzteilseiten erhalten durch die Anfragevorlage eine zusätzliche Funktion; es wurden keine Kombinationen aus Modell × Ort × Fehlerbild als leere Landingpages erzeugt. Das entspricht Googles [Hinweisen zu generierten Inhalten und Mehrwert](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

LLM-Indizes und strukturierte Quellen erleichtern die Verarbeitung der Inhalte; sie garantieren weder Aufnahme noch Zitate in KI-Antworten. Es wurden keine neuen offenen Lizenzen für fremde Unterlagen behauptet. Sämtliche Änderungen bleiben lokal; kein Push, Deployment oder externer Beitrag.
