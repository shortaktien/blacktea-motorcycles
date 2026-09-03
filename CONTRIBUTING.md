# Zum Wiki beitragen

Black Tea Hilfe ist ein offenes, gemeinschaftlich gepflegtes Archiv. Jeder kann Verbesserungen, Ergänzungen und neue Wiki-Artikel vorschlagen.

## Ohne GitHub mitmachen

Kurze Hinweise, Korrekturen, Quellen und optionale Bilder können direkt am Ende der [Bonfire-Wiki-Seite](https://btm.shortaktien.de/bikes/bonfire) oder [Wildfire-Wiki-Seite](https://btm.shortaktien.de/bikes/wildfire) über „Etwas ergänzen oder korrigieren?“ eingereicht werden. Dafür ist kein GitHub-Konto nötig. Jeder Vorschlag landet zunächst als Entwurf in der redaktionellen Prüfung und wird erst nach Freigabe öffentlich angezeigt.

## So funktioniert ein Beitrag

1. Repository forken oder einen Branch anlegen.
2. Markdown-Datei unter `content/wiki/bonfire/` oder `content/wiki/wildfire/` bearbeiten oder neu anlegen.
3. Für technische Angaben immer Modellbezug, Quelle und möglichst Seitenzahl ergänzen.
4. Pull Request öffnen und kurz beschreiben, was geprüft oder ergänzt wurde.

Beiträge werden vor dem Merge redaktionell geprüft. Ein Merge auf `main` prüft und baut den öffentlichen Stand; ein Produktionsdeployment wird separat und ausschließlich von Maintainer:innen über die geschützte Produktionsumgebung ausgelöst. Forks und externe Pull Requests erhalten keinen Zugriff auf VPS-Secrets.

## Format eines Wiki-Artikels

```md
---
title: Akku und BMS
model: Bonfire
intro: Kurze Einordnung des Artikels.
status: Entwurf
source: /pdfs/15-bonfire-handbuch-lokal.pdf
sourceLabel: Bonfire-Handbuch lokal öffnen
---

## Überblick

Verständlich formulierte, belegte Informationen.
```

Bitte keine privaten Daten, Zugangsdaten oder ungeprüften Sicherheits- und Kompatibilitätsversprechen einreichen. Historische Shopangaben, Community-Hinweise und Drittanbieterangebote müssen klar gekennzeichnet werden.
