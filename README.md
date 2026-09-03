# Black Tea Motorbikes – Hilfe

Dieses Repository existiert, damit die technische Geschichte der Black-Tea-Motorräder nicht mit einer nicht mehr verlässlich erreichbaren Website verschwindet.

Für die Black Tea Motorbikes GmbH wurde laut der öffentlich dokumentierten Bekanntmachung vom **14.07.2026** im Verfahren mit dem Aktenzeichen **1513 IN 2588/26** eine vorläufige Insolvenzverwaltung angeordnet. Das ist nicht automatisch dasselbe wie ein bereits eröffnetes Insolvenzverfahren, und der Verfahrensstand kann sich ändern. Es zeigt aber, warum Handbücher, Schaltpläne, Ersatzteilspuren und Erfahrungswissen für Besitzer:innen besonders wichtig sind: Sie helfen dabei, Fahrzeuge sicher zu warten, Fehler einzugrenzen und passende Teile oder Fachbetriebe zu finden.

Black Tea Motorcycles ist deshalb eine **unabhängige, nicht-offizielle Sammelstelle** für Bonfire, Bonfire X und Wildfire. Das Projekt steht in keiner Verbindung zur Black Tea Motorbikes GmbH, verkauft keine BTM-Fahrzeuge und gibt keine Herstellergarantie oder BTM-Freigabe. Quellen, Versionsstände, Unsicherheiten und Rechte werden nachvollziehbar dokumentiert.

## Was dieses Repository bewahrt

- historische Informationen aus früher öffentlich erreichbaren BTM-Seiten und Produktdaten
- Handbücher, Schaltpläne und Datenblätter als dokumentierte Archivspuren
- Community-Erfahrungen, Reparaturhinweise und Fehlersymptome
- Ersatzteilnamen, Teilenummern und mögliche Bezugsquellen
- eine statische React/Vite-Website mit einer kleinen Symfony-API für Feedback und moderierte Kommentare
- ein offenes Bikes-Wiki, dessen Markdown-Artikel per Pull Request gemeinschaftlich erweitert werden können

Der Grundsatz lautet: **so viel wie möglich bewahren, aber nichts als offiziell, sicher, kompatibel oder aktuell ausgeben, wenn es nicht belegt ist.** Sicherheitskritische Arbeiten an Akku, Hochvolt, Bremse, Fahrwerk und Antrieb gehören in qualifizierte Hände.

## Zum Bikes-Wiki beitragen

Das Wiki ist der gemeinschaftliche Bereich für technische Informationen zu den Black Tea **Bonfire**- und **Wildfire**-Modellen. Die sichtbaren Einstiege findest du auf der Website unter:

- [Bonfire-Wiki](https://btm.shortaktien.de/bikes/bonfire)
- [Wildfire-Wiki](https://btm.shortaktien.de/bikes/wildfire)

Du brauchst für einen Hinweis keinen GitHub-Account: Am Ende jedes Bike-Artikels kannst du über **„Etwas ergänzen oder korrigieren?“** direkt eine Wiki-Ergänzung, eine Quelle und optional ein Bild einreichen. Die Redaktion prüft den Vorschlag im Admin-Bereich; erst freigegebene Beiträge werden auf der Website angezeigt. So können auch kurze Korrekturen und praktische Erfahrungen ohne GitHub eingebracht werden.

Die Inhalte liegen direkt im Repository unter [`content/wiki/`](content/wiki/). Jede Markdown-Datei wird beim nächsten Build automatisch als Wiki-Artikel eingebunden. `content/wiki/bonfire/index.md` erzeugt zum Beispiel die Bonfire-Seite; weitere Dateien in diesem Ordner werden zu eigenen Unterseiten. Entsprechend gilt das für `content/wiki/wildfire/`.

### So kannst du einen Artikel ergänzen

Für kurze Hinweise ist das Formular auf der Website der einfachste Weg. Für größere Ergänzungen oder einen vollständigen neuen Artikel kannst du weiterhin den folgenden GitHub-Weg nutzen:

1. Repository auf GitHub forken und einen eigenen Branch anlegen.
2. Einen bestehenden Artikel unter [`content/wiki/bonfire/`](content/wiki/bonfire/) oder [`content/wiki/wildfire/`](content/wiki/wildfire/) öffnen – oder eine neue Datei mit einem kurzen Dateinamen wie `akku-bms.md` anlegen.
3. Den Artikel in Markdown schreiben: verständliche Überschriften, kurze Absätze und Listen verwenden.
4. Jede technische Aussage mit Modellbezug und Quelle belegen. Bei PDFs möglichst den Dateinamen und die Seitenzahl im Text nennen; lokal gesicherte PDFs sind gegenüber flüchtigen externen Links vorzuziehen.
5. Änderungen committen und einen Pull Request gegen `main` öffnen. Die [Beitragsregeln](CONTRIBUTING.md) und die Pull-Request-Checkliste helfen bei der Einreichung.

Ein neuer oder geänderter Artikel wird erst nach der redaktionellen Prüfung veröffentlicht. So können Besitzer:innen beitragen, während unklare Angaben, private Daten und unbelegte Sicherheits- oder Kompatibilitätsversprechen draußen bleiben.

### Kopfbereich eines Wiki-Artikels

Jede Datei beginnt mit einem kleinen Metadatenblock. `model`, `source` und `sourceLabel` sollten immer gepflegt werden:

```md
---
title: Akku und BMS
model: Bonfire
intro: Kurze Einordnung des Artikels für die Übersichtsseite.
status: Entwurf
source: /pdfs/15-bonfire-handbuch-lokal.pdf
sourceLabel: Bonfire-Handbuch lokal öffnen
---

## Überblick

Hier stehen die belegten, verständlich formulierten Informationen.
```

Für eine lokale Vorschau reicht anschließend `docker compose up --build`; die Seite ist dann unter `http://localhost:5173/bikes/bonfire` beziehungsweise `http://localhost:5173/bikes/wildfire` erreichbar. Ausführliche Formatregeln und die vollständige Checkliste stehen in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Rechtlicher und redaktioneller Hinweis

Eine frühere Veröffentlichung im Internet ist kein Freibrief für eine neue Veröffentlichung. Die lokalen PDF-Kopien dürfen nur dann dauerhaft öffentlich angeboten werden, wenn eine passende Erlaubnis oder Lizenz vorliegt. Für ungeklärte Dateien werden mindestens Herkunft und Rechte-Status festgehalten; bei einer Rechtebeanstandung muss die Datei aus der öffentlichen Auslieferung genommen oder durch einen Quellenlink ersetzt werden.

Die Rechteklärung erfolgt je nach Herkunft bei unterschiedlichen Stellen:

- offizielle BTM-Unterlagen: beim zuständigen Insolvenzverwalter bzw. dem von ihm benannten Rechteinhaber; den Verfahrensstand bitte im [amtlichen Insolvenzportal](https://www.insolvenzbekanntmachungen.de/) prüfen
- Forum-Anhänge: beim jeweiligen Uploader/Autor und ergänzend bei der Forum-Administration
- Community-PDFs: beim Autor und beim Betreiber der jeweiligen Community-Seite
- Hersteller-Datenblätter: beim jeweiligen Hersteller oder Rechteinhaber

Die vollständige Herkunfts- und Rechteübersicht steht in [research/pdfs.json](research/pdfs.json). Die in `frontend/public/pdfs/` liegenden Dateien sind **nicht automatisch zur Weiterveröffentlichung freigegeben**.

Die eigentlichen PDF-Dateien werden deshalb bewusst **nicht in GitHub versioniert**. Ihre Dateinamen, Herkunft und der Rechte-Status bleiben in `research/pdfs.json` nachvollziehbar; die PDFs selbst werden separat auf dem VPS verwaltet. Der öffentliche GitHub-Stand enthält damit keine vollständigen Dokumentkopien.

## Schnellstart mit Docker

### Voraussetzungen

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) mit laufendem Docker Compose

### Repository klonen

```bash
git clone https://github.com/shortaktien/blacktea-motorcycles.git
cd blacktea-motorcycles
```

### Backend-Konfiguration anlegen

Die lokale Backend-Konfiguration enthält Geheimnisse und wird durch `.gitignore` nicht versioniert:

```bash
cp backend/.env.example backend/.env
```

In `backend/.env` mindestens diese Werte setzen:

```dotenv
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=<zufälliger-langer-wert>
ADMIN_EMAIL=<deine-admin-e-mail>
ADMIN_PASSWORD_HASH=<passwort-hash>
```

Einen zufälligen Secret-Wert kannst du zum Beispiel mit `openssl rand -hex 32` erzeugen. Für das Admin-Passwort sollte ein Passwort-Hash verwendet werden, niemals das Klartextpasswort. Die Admin-Funktion ist nur für die Moderation der Kommentare gedacht.

Für das öffentliche **„Bug melden“**-Popup werden Meldungen serverseitig als GitHub-Issue angelegt. Dafür zusätzlich einen Fine-grained Personal Access Token ausschließlich für dieses Repository mit der Berechtigung **Issues: Read and write** hinterlegen:

```dotenv
GITHUB_REPOSITORY=shortaktien/blacktea-motorcycles
GITHUB_TOKEN=<nur-serverseitig-setzen>
BUG_REPORT_ALLOWED_HOSTS=btm.shortaktien.de,127.0.0.1,localhost
PUBLIC_SITE_URL=https://btm.shortaktien.de
EMAIL_CONFIRMATION_TTL_SECONDS=86400
MAILJET_API_KEY=<nur-serverseitig-setzen>
MAILJET_API_SECRET=<nur-serverseitig-setzen>
MAILJET_FROM_EMAIL=info@shortaktien.de
MAILJET_FROM_NAME=BTM-Hilfe
```

Der GitHub-Token sowie die Mailjet-Zugangsdaten dürfen niemals in `frontend/`, im Browser-Bundle oder in GitHub-Issue-Inhalten landen. Öffentliche Beiträge und Bugmeldungen werden vor der Annahme per Einmal-Link in einer Bestätigungs-E-Mail verifiziert. Der Link läuft standardmäßig nach 24 Stunden ab. Bestätigte Beiträge landen anschließend in der redaktionellen Prüfung; erst bestätigte Bugmeldungen werden als GitHub-Issue angelegt. Name und Beschreibung werden bei Bugmeldungen ins Issue übernommen; die E-Mail dient der Bestätigung und Spambegrenzung und wird nicht öffentlich veröffentlicht. Im Repository sind GitHub Issues bereits aktiviert und das Label `bug` vorhanden.

### Anwendung starten

```bash
docker compose up --build
```

Danach sind die Dienste erreichbar unter:

- Website: <http://localhost:5173>
- Symfony-Health-Check: <http://localhost:8000/api/health>
- Kommentar-Moderation: <http://localhost:5173/admin>

Zum Stoppen:

```bash
docker compose down
```

Die Docker-Volumes für `node_modules` und Composer-Abhängigkeiten bleiben dabei erhalten. Für einen vollständigen Neuaufbau der Abhängigkeiten kann der Build erneut mit `docker compose up --build` gestartet werden.

### PDF-Dateien

Die eigentlichen PDF-Dateien werden aus Rechte- und Speichergründen nicht über den öffentlichen GitHub-Stand verteilt. Freigegebene Dokumente werden von Maintainer:innen separat bereitgestellt und vor der Veröffentlichung rechtlich geprüft. Herkunft, Abrufdatum und Rechte-Status gehören weiterhin in [research/pdfs.json](research/pdfs.json).

## Entwicklung ohne Docker

### Frontend

Für die Entwicklung ohne Docker werden Node.js 24 und npm 10 oder neuer verwendet.

```bash
cd frontend
npm ci
npm run dev
```

Für einen Produktions-Build:

```bash
npm run build
```

Der Build-Qualitätscheck prüft die erzeugte Sitemap, alle internen LLM-Links, den PDF-Index samt lokalen PDF-Dateien und die noindex Auth-Routen:

```bash
npm run check:seo
```

Der Deploy-Workflow führt diesen Check zusätzlich über einen statischen HTTP-Preview aus und prüft nach dem VPS-Neustart die öffentlichen SEO- und Auth-Endpunkte erneut.

### Backend

Das Backend benötigt PHP 8.2 oder neuer sowie Composer. Abhängigkeiten installieren und den Entwicklungsserver starten:

```bash
cd backend
composer install
php -S 127.0.0.1:8000 -t public public/index.php
```

Die Frontend-API-Adresse ist für die Docker-Entwicklung über den Vite-Proxy vorgesehen. Für eine separate lokale Ausführung muss die Proxy-Konfiguration und gegebenenfalls die API-URL an die eigene Umgebung angepasst werden.

## Projektstruktur

```text
frontend/              React/Vite-Website und öffentliche Archivdateien
frontend/public/pdfs/  lokal gesicherte Handbücher, Pläne und Datenblätter
backend/               Symfony-API, Health-Check und Kommentar-Moderation
content/wiki/          gemeinschaftliche Wiki-Artikel zu Bonfire und Wildfire
research/              Quellen, Provenienz, Ersatzteil- und Rechte-Metadaten
docker-compose.yml     lokale Entwicklungsumgebung
docker-compose.prod.yml Produktionsstack mit statischem Caddy-Frontend
deploy/Caddyfile.btm.example  Caddy-Site-Block für btm.shortaktien.de
```

Wiki-Beiträge werden über GitHub-Pull-Requests eingereicht und vor der Veröffentlichung geprüft. Format und Checkliste stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

## Neue Quellen oder Dokumente ergänzen

1. Originalquelle, Abrufdatum und Modell-/Versionsbezug in `research/` dokumentieren.
2. Für jedes Dokument in [research/pdfs.json](research/pdfs.json) Herkunft und `rights_status` pflegen.
3. Offizielle Quelle, Community-Hinweis und eigene redaktionelle Zusammenfassung klar voneinander trennen.
4. Keine Kompatibilität, Verfügbarkeit, Zulassung oder Sicherheit aus einem bloßen Marktplatztreffer ableiten.
5. Vor öffentlicher Weitergabe vollständiger Dateien die Nutzungsrechte schriftlich klären.

## Was bewusst nicht ins Repository gehört

Die `.gitignore` schützt lokale und generierte Daten. Nicht versioniert werden unter anderem:

- `frontend/node_modules/`
- `frontend/dist/`
- `backend/vendor/`
- `backend/var/` mit Sessions, Rate-Limits und Community-Daten
- `backend/.env` und lokale Umgebungsdateien
- `.DS_Store`

Die PDF-Dateien unter `frontend/public/pdfs/` sind ausdrücklich erfasst und werden nicht versioniert. Der HTML-Index bleibt als öffentliche Übersicht erhalten; die eigentlichen PDFs werden separat auf dem VPS verwaltet und müssen vor der öffentlichen Bereitstellung rechtlich geprüft werden.

## Produktionsauslieferung

Das Repository ist öffentlich, der Produktionszugriff aber nicht. Beiträge werden offen per Formular oder Pull Request gesammelt; Produktionsdeployments führen ausschließlich Maintainer:innen aus. Die öffentliche Dokumentation enthält deshalb keine echte VPS-Adresse, Zugangsdaten, SSH-Schlüssel oder Secret-Werte.

Der interne Deploy-Workflow ist manuell und durch eine geschützte GitHub-Umgebung mit Required Reviewer abgesichert. Er akzeptiert ausschließlich den geprüften `main`-Stand. Forks und externe Pull Requests erhalten keinen Zugriff auf die Produktions-Secrets und können keinen Deploy auf den VPS auslösen.

Die öffentliche Website kann unabhängig davon lokal mit Docker gestartet werden. Für den VPS wird der Produktionsstack verwendet:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

`frontend/Dockerfile.prod` baut zuerst mit `npm run build`, inklusive SEO-Dateigenerierung und serverseitigem Prerendering. Das fertige `dist/` wird anschließend ausschließlich über den Caddy-Container auf Port 80 ausgeliefert. Der Vite-Dev-Server ist in diesem Stack nicht enthalten und wird nicht öffentlich betrieben. API-Anfragen werden intern von Caddy an `backend:8000` weitergeleitet.

Der Site-Block aus [deploy/Caddyfile.btm.example](deploy/Caddyfile.btm.example) wird in die bestehende TLS-Caddy-Konfiguration übernommen. Der `/api/*`-Pfad muss dabei direkt an den `backend:8000`-Dienst gehen; die übrigen Anfragen gehen an den statischen `frontend:80`-Dienst. So kann kein älterer API-Upstream neue Auth-, Community- oder Bugreport-Routen verdecken. Unbekannte Pfade fallen nicht auf `index.html` zurück, sondern erhalten HTTP 404. `/pdfs/` wird auf den kanonischen PDF-Index `/pdfs/index.html` weitergeleitet.

Die Sitemap wird bei jedem Build aus den tatsächlich vorhandenen Reparatur-, Wiki-, Ersatzteil- und PDF-Dateien erzeugt. `lastmod` bleibt standardmäßig weg, weil ein Build allein keine Inhaltsänderung beweist. Für bewusst dokumentierte Änderungen können `SEO_LASTMOD_MAP` (JSON mit URL-Pfaden und ISO-Daten) oder – nur bei einer echten Gesamtänderung – `SEO_LASTMOD` gesetzt werden.

## Quellen und Status

Die Recherche und die historischen Daten sind Momentaufnahmen. Der Status eines Insolvenzverfahrens, die Erreichbarkeit externer Seiten, Preise, Lagerbestände und Ersatzteilkompatibilität können sich ändern. Maßgebliche Nachweise und weiterführende Quellen stehen in [research/black-tea-quellen.md](research/black-tea-quellen.md) und [research/bezugsquellen-amazon.md](research/bezugsquellen-amazon.md).
