# Google-Indexierung – Untersuchung vom 7. Oktober 2026

## Direkt in der Search Console bestätigt

- Indexierungsbericht, Stand 04.10.2026: 1 indexierte URL, 159 nicht indexiert. Davon 146 „Gefunden – zurzeit nicht indexiert“, 13 „Gecrawlt – zurzeit nicht indexiert“.
- Einzige Beispiel-URL im Bericht „Indexierte Seiten“: `/ersatzteile/display`, letzter Crawl 04.09.2026.
- Keine manuellen Maßnahmen; keine gemeldeten Sicherheitsprobleme.
- Sitemap am 06.10.2026 erfolgreich gelesen; 160 erkannte URLs. Der temporäre Sitemap-Verarbeitungsfehler in der Einzelprüfung der Startseite ist kein Beleg für eine derzeit defekte Sitemap.
- Crawling-Statistik, Stand 05.10.2026: 123 Anfragen, durchschnittliche Antwortzeit 458 ms, keine Hostprobleme in den letzten 90 Tagen. Antworten: 84 % HTTP 200, 11 % HTTP 304, 4 % HTTP 404, unter 1 % HTTP 301. Alle vier angezeigten 404-Beispiele betreffen `/favicon.ico` (03.09., 09.09., 15.09., 27.09.). Der Bericht zählt fünf 404-Abrufe; die Beispiele sind somit keine vollständige Liste aller fünf Abrufe.
- `/insolvenz`: letzter regulärer Crawl 25.09.2026, 15:45:05; Smartphone-Googlebot; Abruf erfolgreich; Crawling und Indexierung erlaubt; selbstreferenzierende Canonical; trotzdem „Gecrawlt – zurzeit nicht indexiert“.
- Google-Live-Test `/insolvenz` am 07.10.2026, 18:56: „URL ist für Google verfügbar“, „Seite kann indexiert werden“. Mobile Screenshot-Darstellung zeigt Titel und Hauptinhalt. Robots-Meta und Canonical im getesteten HTML korrekt.
- `/`: letzter regulärer Crawl 09.09.2026, 08:56:32; erfolgreicher Abruf und Indexierung erlaubt; trotzdem nicht indexiert.
- Für `/insolvenz` wurde am 07.10.2026 erneut die Indexierung beantragt. Google bestätigte die Aufnahme in die bevorzugte Crawling-Warteschlange. Noch keine bestätigte Indexierung; wiederholte Anträge ändern laut Bestätigung weder Reihenfolge noch Priorität.

## Interpretation und Grenzen

Die 13 gecrawlten, aber ausgeschlossenen Beispiel-URLs wurden vollständig erfasst: `/bikes/wildfire` (03.10.), `/bikes/bonfire` (27.09.), `/wiki`, `/hilfe/controller`, `/hilfe`, `/werkstaetten`, `/hilfe/akku-bms`, `/insolvenz`, `/ersatzteile`, `/hilfe/ersatzteil-finden` (jeweils 25.09.), `/faq` (23.09.), `/` (09.09.), `/community` (08.09.). Der Ausschluss betrifft somit die zentralen Inhalte, nicht nur lange unbesuchte Archivlisten. Crawl-Daten sind keine präzisen Zeitpunkte der Entfernung aus dem Index.

Die untersuchte Insolvenzseite scheitert nicht an einer aktuellen Abrufsperre, einem noindex-Tag oder einer falschen Canonical. Auch historische Hostprobleme werden im verfügbaren Google-Bericht nicht gemeldet. Dies spricht eher für Googles Indexauswahl beziehungsweise Bewertung als für einen nachgewiesenen technischen Defekt. Google nennt jedoch keine konkrete Qualitätsursache.

Das [September-2026-Spam-Update](https://status.search.google.com/incidents/XhUDXP7A67iHCD2kmbVu) begann am 24.09.2026. Der zeitliche Zusammenhang mit dem Traffic-Einbruch ist eine Hypothese, kein Nachweis einer algorithmischen Spam-Einstufung dieser Website. Keine manuelle Maßnahme schließt algorithmische Auswirkungen nicht aus.

Der lokale Katalog umfasst 106 Ersatzteil-URLs, mit 102 erfolgreich archivierten Datensätzen. Das allein belegt weder Spam noch minderwertige Inhalte. Vor einer Entscheidung zum Zusammenlegen oder noindex müssen die einzelnen Seiten auf eigene technische Angaben, geprüfte Kompatibilität, nachvollziehbare Quellen und tatsächlichen Nutzen geprüft werden. Keine pauschale Deindexierung des Archivs.

## Priorisierte nächste Arbeit

1. 13 bereits gecrawlte, ausgeschlossene URLs einzeln erfassen; frühere Traffic-Seiten priorisieren und ihre tatsächlichen Inhalte mit dem regulären Google-Crawl abgleichen, soweit verfügbar.
2. Der nachgewiesene Favicon-404 wurde lokal mit einer dauerhaften Weiterleitung auf das bereits vorhandene `/favicon.webp` korrigiert und im Produktions-Routing-Test abgesichert. Noch nicht produktiv ausgerollt. Diese kleine Korrektur ist keine belegte Lösung für den Indexverlust.
3. Inhaltsaudit der Ersatzteilseiten und der früheren Traffic-Einstiege: eigene belegte Informationen statt bloßer Textverlängerung, konkrete Quellen, verständliche Autoren-/Prüfverantwortung. Keine erfundenen Daten, keine vorgeschobenen Aktualisierungsdaten.
4. Nur nach konkreten Verbesserungen erneut crawlen lassen und anhand von Indexstatus sowie Impressionen bewerten. Ein akzeptierter Indexierungsantrag ist keine bestätigte Indexierung.

## Quellen

- [Google: Crawling-Fehler untersuchen](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
- [Google: Seitenindexierungsbericht](https://support.google.com/webmasters/answer/7440203)
- [Google: Spam-Updates](https://developers.google.com/search/docs/appearance/spam-updates)

Es wurden im Rahmen dieser Untersuchung keine Inhalte gelöscht, keine Seiten auf noindex gesetzt und keine Produktionsänderungen ausgerollt.

## Lokale Prüfung der Favicon-Korrektur

- `node --check frontend/scripts/check-production-routing.mjs`: erfolgreich.
- `git diff --check`: erfolgreich.
- `node --experimental-strip-types frontend/scripts/check-owner-help.mjs`: erfolgreich; 138 HTML-Routen, drei Leitfäden, 17 FAQ-Direktlinks und vier Suchintentionen.
- Produktions-Routing-Test nicht ausführbar: kein laufender Docker-Daemon am konfigurierten OrbStack-Socket. Die neuen HTTP-Assertions sind daher noch nicht zur Laufzeit bestätigt.
