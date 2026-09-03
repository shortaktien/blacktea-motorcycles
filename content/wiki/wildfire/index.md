---
title: Wildfire
model: Wildfire
intro: Technische Dokumente, elektrische Systeme und belegte Diagnosehinweise zur Black Tea Wildfire.
status: Startartikel · offen für Ergänzungen
source: /pdfs/19-wildfire-handbuch-community.pdf
sourceLabel: Wildfire-Handbuch lokal öffnen
---

## Überblick

Diese Seite bündelt die wichtigsten technischen Anlaufpunkte zur Black Tea Wildfire. Sie ist eine unabhängige redaktionelle Aufbereitung aus lokal gesicherten Dokumentenspuren und Community-Berichten, keine aktuelle Herstellerfreigabe. Softwarestand, Baujahr, Ausstattung und Umbauten können die tatsächliche Fahrzeugkonfiguration verändern.

Vor einer Diagnose deshalb Modelljahr, Anzeige-/Controller-Version, Akku-Konfiguration und die konkrete Fahrzeugvariante festhalten. Fotos von Steckern und Bauteilaufklebern helfen bei der späteren Zuordnung.

## Technische Eckdaten aus den Community-Unterlagen

Die folgenden Werte helfen beim ersten Abgleich von Reichweite, Fahrmodus, Akku und Wartung. Sie stammen aus dem [Wildfire-Handbuch der Community](/pdfs/19-wildfire-handbuch-community.pdf), dem [Wartungshinweis](/pdfs/20-wildfire-wartung-community.pdf) und dem [Willkommenshinweis](/pdfs/01-wildfire-willkommenshinweis.pdf). Es gibt hier bewusst keine scheinbar einheitliche Hersteller-Tabelle: Die Dokumente beziehen sich auf unterschiedliche Stände und enthalten beim Reifendruck sogar abweichende Angaben.

### Reichweite, Fahrmodi und Akku

- **Reichweite:** ungefähr 60–120 km pro Akku, abhängig von Tempo, Gelände, Reifen, Reifendruck und Fahrergewicht.
- **Eco:** bis 90 km/h, 7 kW pro Akku und sanfte Beschleunigung.
- **Normal:** bis 100 km/h, 10 kW pro Akku.
- **Sport:** 110 km/h mit einem Akku beziehungsweise 125 km/h mit zwei Akkus; im Dokument als Modus für kurze Strecken und Überholvorgänge beschrieben.
- **Ladetemperatur:** unter 0 °C nicht laden.
- **Lebensdauer:** ungefähr 800 Vollzyklen bis etwa 80 % Restkapazität; das ist ein Orientierungswert aus der Community-Dokumentation.
- **Spannungsanzeige:** Die Community-Tabelle ordnet 115 V ungefähr 100 % und 87 V ungefähr 0 % zu. Diese Werte nicht als universelle BMS- oder Controller-Grenzen übernehmen.

### Reifen, Bremse und Pflege

- **Reifendruck:** Ein Dokument nennt 2,5 bar vorn und hinten. Ein anderer Abschnitt nennt mindestens 2,4 bar vorn und 2,6 bar hinten. Vor jeder Fahrt gilt die passende Vorgabe für das konkrete Fahrzeug und den montierten Reifen.
- **Bremse:** Die kombinierte Hinterrad-/Vorderradbremse liegt links am Lenker, die Vorderradbremse rechts; eine Fußbremse ist nicht vorgesehen.
- **Druckprüfung:** Im Willkommenshinweis wird eine Prüfung alle zwei Wochen empfohlen, weil Speichenräder etwa 0,1–0,3 bar pro Woche verlieren können.
- **Inspektion:** Der Community-Wartungshinweis nennt eine erste Inspektion nach 12.000 km oder innerhalb der ersten zwei Jahre, danach alle 12.000 km. Das ist eine historische Community-Spur und ersetzt keinen fahrzeugspezifischen Wartungsplan.

### Wartungswerte aus den Wildfire-Unterlagen

Die ausführlichere Handbuchfassung und die Zusammenfassung aus dem Forum nennen für die Wildfire zusätzlich eine wöchentliche beziehungsweise alle zehn Betriebsstunden empfohlene Reifendruckkontrolle. Als Orientierung werden mindestens 2,4 bar vorn und 2,6 bar hinten, höchstens 3,0 bar, genannt. Maßgeblich bleiben Reifen, Beladung, Modellstand und die Vorgabe am eigenen Fahrzeug.

Für einzelne Verschraubungen werden 150 Nm an der Hinterachse, 120 Nm an der Vorderachse, 30–40 Nm an der Schwingenachse sowie 5–20 Nm für bestimmte Klemm- und M6-Schrauben genannt. Diese Werte sind nicht pauschal auf jede Wildfire übertragbar: Vor dem Anziehen muss die konkrete Schraube, Baugruppe und Revision identifiziert werden.

Diese Angaben sind für die Vorauswahl und das Gespräch mit einer Werkstatt nützlich. Sie ersetzen weder die Prüfung von Modelljahr, Softwarestand und Akkuanzahl noch eine Freigabe für Reifen, Bremsen, Controller oder Ersatzteile.

## Laden, Batterie und Zelltechnik

### Ladeleistung und Rekuperation

Die bereitgestellten Wildfire-Unterlagen beschreiben die Einstellung „Maximaler Ladestrom“ als Stromwert auf der Akku-Seite. Die dort genannten 8, 16, 32 und 64 A sind deshalb nicht einfach mit dem Strom einer 230-V-Haushaltssteckdose gleichzusetzen. Für einen dokumentierten 110-V-Akku und das dort verwendete Ladegerät werden ungefähr 0,9 kW, 1,8 kW, 3,6 kW und 6,6 kW Ladeleistung als Beispiele genannt.

- Haushaltssteckdosen sollten in den Unterlagen möglichst mit etwa 2 kW belastet werden; Ladegerät, Leitung und Absicherung müssen trotzdem zusammenpassen.
- An einer 11-kW-Ladesäule ist häufig nur ein begrenzter Anteil je Phase nutzbar. Eine 22-kW-Säule kann je nach Fahrzeug- und Ladegerätkonfiguration mehr Leistung bereitstellen, macht aber kein ungeeignetes Ladegerät passend.
- Eine Begrenzung des Ladestroms kann auch die zulässige Rekuperation begrenzen. Als Dokumentationshilfe werden 10 A bei 8 A Ladestrom, 20 A bei 16 A und 40 A bei 32 A genannt. Das sind keine universellen Einstellwerte.

Nach einer Fahrt soll der Akku zunächst abkühlen; die Community-Unterlagen nennen ungefähr eine Stunde. Unter 0 °C darf der Akku nicht geladen werden. Bei kalter Lagerung sollte ein vollständig entladener Akku vermieden werden. Die Hinweise gelten für den Batteriepack und die konkrete Ladeelektronik, nicht automatisch für jede Wildfire-Generation.

### Einzelzelle ist nicht Akkupack

Das zusätzlich bereitgestellte BAK-Datenblatt beschreibt eine einzelne N21700CG-50-Zelle: 5.000 mAh Nennkapazität, 3,60 V Nennspannung, 4,20 V Ladeschlussspannung und 2,50 V Entladegrenze unter den dort beschriebenen Laborbedingungen. Es nennt außerdem 0–45 °C als Ladebereich, −20–60 °C als Entladebereich, höchstens 30 mΩ Wechselstrom-Innenwiderstand und eine Lagerung von 3,50–3,80 V pro Zelle.

Diese Werte belegen weder den Aufbau noch die Freigabe eines Wildfire-Akkupacks. Anzahl und Verschaltung der Zellen, BMS, Sicherungen, Stecker, Gehäuse, Ladegerät und Fahrzeugsoftware müssen separat geprüft werden. Einzelzellen dürfen nicht selbst aus einem Pack ausgebaut, gemischt oder ersetzt werden.

## FarDriver, Leistung und Einstellungen

### Line Current, Phase Current und Wärme

Die Community-Dokumente unterscheiden zwei Strombegriffe. Der **Line Current** beschreibt den Batteriestrom und wirkt sich vor allem auf Beschleunigung bei höherem Tempo und die mögliche Dauerleistung aus. Der **Phase Current** beeinflusst vor allem Anfahrmoment und Beschleunigung bei niedriger Geschwindigkeit. Höhere Werte erhöhen die thermische Belastung von Akku, Motor und Controller.

In den Unterlagen stehen je nach Controllerstand unterschiedliche Bereiche: ältere Controller werden beispielsweise mit etwa 70–130 A bei einem Akku und 140–260 A bei zwei Akkus beim Line Current beschrieben; für neuere Stände werden niedrigere Bereiche genannt. Beim Phase Current reichen die dokumentierten Bereiche ebenfalls von etwa 300–450 A bis 400–650 A. Das sind historische Community-Einstellungen, keine Empfehlung für jedes Fahrzeug.

Für die grobe elektrische Plausibilitätsprüfung gilt: Eingangsleistung ist näherungsweise Batteriespannung × Batteriestrom. Phasenstrom darf nicht einfach als zusätzlicher Batteriestrom zur Leistung addiert werden. Die maximal mögliche Leistung hängt außerdem von Akkuabsicherung, Spannungseinbruch, Temperatur, BMS und Controllerbegrenzung ab.

### Controller-Einstellungen sicher einordnen

Die FarDriver-App und die Bluetooth-Verbindung gehören immer zu einem konkreten Controller- und Softwarestand. Werte aus einem Spickzettel oder aus dem Forum dürfen nicht blind übernommen werden. Vor jeder Änderung müssen Akkuzahl, Controllerrevision, Firmware, Sicherung, Motordaten und die Folgen für Temperatur und Rekuperation dokumentiert werden. Änderungen an Hochstrom- und Antriebsparametern gehören in qualifizierte Hände.

## Die wichtigsten Dokumentenspuren

Für die Wildfire sind mehrere Dokumenttypen erfasst:

- Willkommenshinweis und grundlegende Fahrzeuginformationen
- Kabelbaum und System-Harness mit dokumentiertem 12-V-Ausgang
- Wildfire-Software und Hinweise zu unterschiedlichen Softwareständen
- Community-Handbücher 1.3 und 1.4 mit ergänzten Wartungs- und Fehlerhinweisen
- CT-22-Dashboard-Unterlagen für Anzeige und Bedienung

Die Dokumente werden im [PDF-Archiv](/pdfs/) und in der [Quellenübersicht](/quellen) mit Herkunft und Status geführt. Eine ältere Dokumentversion darf nicht automatisch als Anleitung für jede Wildfire verwendet werden.

## Elektrik und Diagnose

### 12-V-System und DC/DC-Wandler

In der Recherchebasis wird der `IPS-DTD110S1210` als möglicher 110-V-DC-auf-12-V-DC-Wandler mit 10 A genannt. Das ist eine Community-Spur, kein bestätigter Drop-in-Ersatz. Vor einem Austausch müssen Eingangsspannung, Ausgang, Strom, Steckverbinder, Einbauraum, Absicherung und die tatsächliche Verkabelung am Fahrzeug abgeglichen werden. Der [Wildfire-DC/DC-Rechercheeintrag](/ersatzteile/dcdc-converter) zeigt den derzeitigen Belegstand.

Ein elektrisch ähnlicher Mean-Well-Wandler ist nicht automatisch mechanisch, steckerseitig oder fahrzeugseitig passend. Kein Kauf-Link sollte allein aus Spannung und Strom abgeleitet werden.

### Controller- und MOSFET-Fehler

In einem Community-Fall wird Fehler-/Piepton-Code 13 mit der High-Side der MOSFETs in Verbindung gebracht. Derselbe Fehlerbereich kann aber auch durch lose Phasenleitungen, Bremsalarm, Steckkontakte oder weitere Ursachen beeinflusst werden. Deshalb den Controller nicht auf Verdacht tauschen und keine FarDriver-Einstellungen aus einem anderen Baujahr übernehmen.

Arbeiten an Hochstromleitungen, Akku, BMS, Controller und Motor gehören in qualifizierte Hände. Bei Hitze, Geruch, sichtbaren Schäden oder ungewöhnlichen Geräuschen das Fahrzeug nicht weiter betreiben.

### Fehlercodes und Abschaltungen

Das Wildfire-Handbuch ordnet die Pieptöne des Antriebsstrangs als erste Fehlerklasse ein. Die Zuordnung ist ein Diagnosehinweis, kein Beweis für ein einzelnes defektes Bauteil:

| Pieptöne | Dokumentierte Fehlerklasse |
| --- | --- |
| 1 | Hall-Sensoren am Motor beschädigt oder nicht verbunden |
| 2 | Gasgriff beschädigt, nicht verbunden oder Signal unplausibel |
| 3 | Schutzfehler des Antriebsstrangs |
| 4 | Phasenstrom zu hoch |
| 5 | Über- oder Unterspannung |
| 6 | Fahrzeug falsch eingeschaltet |
| 7 | Motor überhitzt |
| 8 | Controller überhitzt |
| 9 | Batteriestrom zu hoch |
| 10 | Interner Controllerfehler |
| 11 | Kurzschluss der Motorphasen |
| 12 | Interner Controlleralarm |
| 13 | High-Side der MOSFETs beschädigt |
| 14 | Low-Side der MOSFETs beschädigt |
| 15 | Hardware-Überstrom |

Bei Unterspannung, Übertemperatur, Hall- oder MOSFET-Hinweisen nicht weiterfahren und nicht durch wiederholte Neustarts „testen“. Das Fahrzeug sicher abstellen, Ladegerät trennen und Pieptöne, Displaymeldung, Akkuanzahl sowie die Situation beim Auftreten notieren. Die Unterlagen unterscheiden Warnungen und Eingriffe des BMS; die Fehlerleuchte kann nach der Behebung noch mehrere Fahrten sichtbar bleiben.

### Anzeige und Software

Anzeige, Controller, Bluetooth-Modul und Softwarestand müssen als zusammengehörige Konfiguration betrachtet werden. Ein Ersatzteil mit gleichem Namen kann wegen Stecker, Protokoll, Firmware oder Halterung trotzdem nicht passen. Vor einer Nachrüstung deshalb Typenschild, Steckverbindung, Einbaumaß und vorhandene Software dokumentieren.

### Frühes CT-22-Display

Für frühe Wildfire mit CT-22-Anzeige beschreibt das bereitgestellte Dashboard-Handbuch einige Bedienfunktionen: Die Taste **ADJ** setzt den Tageskilometerzähler nach längerem Drücken zurück; **SET** schaltet bei langem Drücken zwischen km/h und mph um. Die Uhr wird bei ausgeschaltetem Fahrzeug über die Einstelltaste aufgerufen und anschließend mit ADJ und SET verändert.

Das CT-22 besitzt außerdem ein passwortgeschütztes Service- und Kalibriermenü für Geschwindigkeits-, Kilometer- und Ladeanzeige. Diese Werte sind keine normalen Benutzereinstellungen. Eine falsche Kalibrierung kann die Anzeige verfälschen; deshalb hier keine pauschalen Werte oder Änderungsanleitung für fremde Fahrzeuge.

## Räder, Speichen und mechanische Teile

Bei Hinterrad, Nabenmotor und Speichen sind Länge, Kröpfung, Durchmesser, Gewinde, Nippeltyp, Radseite und Baujahr entscheidend. Ein Angebot mit dem Suchbegriff „Wildfire“ ist noch kein passendes Ersatzteil. Die [Ersatzteilübersicht](/ersatzteile) zeigt nur dann einen Kauf-Link, wenn ein belegter technischer Bezug dokumentiert ist.

Für Ausbauarbeiten an Hinterrad, Motor, Bremse oder Fahrwerk muss das Fahrzeug sicher abgestützt werden. Hochvolt- und Motorkabel dürfen nicht unter Zug stehen; sicherheitskritische Reparaturen gehören in eine Fachwerkstatt.

## Sicherer Diagnoseablauf

1. Fehlerbild, Zeitpunkt und aktuellen Software-/Anzeigezustand notieren.
2. Fahrzeug spannungsfrei und gegen Wegrollen gesichert abstellen.
3. Sichtbare Stecker, Kabel, Sicherungen und mechanische Schäden dokumentieren.
4. Teilenummern und Maße am ausgebauten Original erfassen, bevor ein Ersatz gesucht wird.
5. Widersprüchliche Angaben aus Handbuch, Community und Händlerangebot getrennt kennzeichnen.

Bei Akku- oder BMS-Verdacht nicht weiterladen. Die [Reparaturhilfe zu Akku und BMS](/hilfe/akku-bms) beschreibt den Sicherheitsfilter ausführlicher.

> Sicherheitskritische Arbeiten an Akku, Hochvolt, Bremsen, Fahrwerk und Antrieb gehören in qualifizierte Hände.
