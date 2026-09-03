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

Diese Angaben sind für die Vorauswahl und das Gespräch mit einer Werkstatt nützlich. Sie ersetzen weder die Prüfung von Modelljahr, Softwarestand und Akkuanzahl noch eine Freigabe für Reifen, Bremsen, Controller oder Ersatzteile.

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

### Anzeige und Software

Anzeige, Controller, Bluetooth-Modul und Softwarestand müssen als zusammengehörige Konfiguration betrachtet werden. Ein Ersatzteil mit gleichem Namen kann wegen Stecker, Protokoll, Firmware oder Halterung trotzdem nicht passen. Vor einer Nachrüstung deshalb Typenschild, Steckverbindung, Einbaumaß und vorhandene Software dokumentieren.

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
