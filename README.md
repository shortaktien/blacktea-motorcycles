# Black Tea Motorcycles – Community-Archiv und Hilfe

Dieses Repository existiert, damit die technische Geschichte der Black-Tea-Motorräder nicht mit einer nicht mehr verlässlich erreichbaren Website verschwindet.

Für die Black Tea Motorbikes GmbH wurde laut der öffentlich dokumentierten Bekanntmachung vom **14.07.2026** im Verfahren mit dem Aktenzeichen **1513 IN 2588/26** eine vorläufige Insolvenzverwaltung angeordnet. Das ist nicht automatisch dasselbe wie ein bereits eröffnetes Insolvenzverfahren, und der Verfahrensstand kann sich ändern. Es zeigt aber, warum Handbücher, Schaltpläne, Ersatzteilspuren und Erfahrungswissen für Besitzer:innen besonders wichtig sind: Sie helfen dabei, Fahrzeuge sicher zu warten, Fehler einzugrenzen und passende Teile oder Fachbetriebe zu finden.

Black Tea Motorcycles ist deshalb eine **unabhängige, nicht-offizielle Sammelstelle** für Bonfire, Bonfire X und Wildfire. Das Projekt steht in keiner Verbindung zur Black Tea Motorbikes GmbH, verkauft keine BTM-Fahrzeuge und gibt keine Herstellergarantie oder BTM-Freigabe. Quellen, Versionsstände, Unsicherheiten und Rechte werden nachvollziehbar dokumentiert.

## Was dieses Repository bewahrt

- historische Informationen aus früher öffentlich erreichbaren BTM-Seiten und Produktdaten
- Handbücher, Schaltpläne und Datenblätter als dokumentierte Archivspuren
- Community-Erfahrungen, Reparaturhinweise und Fehlersymptome
- Ersatzteilnamen, Teilenummern und mögliche Bezugsquellen
- eine statische React/Vite-Website mit einer kleinen Symfony-API für Feedback und moderierte Kommentare

Der Grundsatz lautet: **so viel wie möglich bewahren, aber nichts als offiziell, sicher, kompatibel oder aktuell ausgeben, wenn es nicht belegt ist.** Sicherheitskritische Arbeiten an Akku, Hochvolt, Bremse, Fahrwerk und Antrieb gehören in qualifizierte Hände.

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

### PDFs separat auf dem VPS ablegen

Nach dem ersten Deployment müssen freigegebene PDF-Dateien separat auf dem VPS unter `/opt/btm/frontend/public/pdfs/` abgelegt werden. Beispiel aus dem Projektverzeichnis:

```bash
ssh <deploy-user>@<vps-host> 'mkdir -p /opt/btm/frontend/public/pdfs'
rsync -av --progress frontend/public/pdfs/*.pdf <deploy-user>@<vps-host>:/opt/btm/frontend/public/pdfs/
```

Die Dateien werden durch `.gitignore` nicht nach GitHub übernommen. Der Deploy-Workflow schließt sie ebenfalls vom `rsync --delete` aus, damit ein späteres Deployment die separat verwalteten VPS-PDFs nicht entfernt. Nur Dokumente mit geklärter Weitergabeberechtigung sollten dort öffentlich erreichbar sein.

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
research/              Quellen, Provenienz, Ersatzteil- und Rechte-Metadaten
docker-compose.yml     lokale Entwicklungsumgebung
deploy/Caddyfile.btm.example  Caddy-Site-Block für btm.shortaktien.de
```

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

## VPS-Deployment nach Review

Der Workflow in [.github/workflows/deploy-vps.yml](.github/workflows/deploy-vps.yml) ist bis zu einem separaten Review **manuell** und reagiert nicht automatisch auf jeden Push. Für einen Deploy sollte GitHub zusätzlich eine geschützte `production`-Umgebung mit mindestens einem Required Reviewer erhalten. Benötigt werden außerdem die dort hinterlegten Secrets `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_APP_PATH`, `VPS_SSH_PRIVATE_KEY` und `VPS_SSH_KNOWN_HOSTS`. Der Deploy-Benutzer darf nicht `root` sein; er benötigt auf dem VPS die erforderlichen Docker-Rechte. Deployments werden nur vom `main`-Branch akzeptiert.

Für den öffentlichen Host muss der Site-Block aus [deploy/Caddyfile.btm.example](deploy/Caddyfile.btm.example) in die bestehende Caddy-Konfiguration übernommen werden. Caddy muss dafür im selben Docker-Netzwerk wie der BTM-Stack laufen; dann sind die Compose-Dienste unter `backend:8000` und `frontend:5173` erreichbar. Läuft Caddy direkt auf dem VPS-Host, müssen diese beiden Ziele stattdessen auf `127.0.0.1:8000` und `127.0.0.1:5173` zeigen. Nach dem Einfügen mit `caddy validate` prüfen und Caddy kontrolliert neu laden.

## Quellen und Status

Die Recherche und die historischen Daten sind Momentaufnahmen. Der Status eines Insolvenzverfahrens, die Erreichbarkeit externer Seiten, Preise, Lagerbestände und Ersatzteilkompatibilität können sich ändern. Maßgebliche Nachweise und weiterführende Quellen stehen in [research/black-tea-quellen.md](research/black-tea-quellen.md) und [research/bezugsquellen-amazon.md](research/bezugsquellen-amazon.md).
