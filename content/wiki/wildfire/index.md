---
title: Wildfire
model: Wildfire
intro: Technische Dokumente, elektrische Systeme und belegte Diagnosehinweise zur Black Tea Wildfire.
status: Startartikel · offen für Ergänzungen
lastUpdated: 2026-09-03
source: /pdfs/19-wildfire-handbuch-community.pdf
sourceLabel: Wildfire-Handbuch lokal öffnen
---

## Überblick

Diese Seite bündelt die wichtigsten technischen Anlaufpunkte zur Black Tea Wildfire. Sie ist eine unabhängige redaktionelle Aufbereitung aus lokal gesicherten Dokumentenspuren und Community-Berichten, keine aktuelle Herstellerfreigabe. Softwarestand, Baujahr, Ausstattung und Umbauten können die tatsächliche Fahrzeugkonfiguration verändern.

Vor einer Diagnose deshalb Modelljahr, Anzeige-/Controller-Version, Akku-Konfiguration und die konkrete Fahrzeugvariante festhalten. Fotos von Steckern und Bauteilaufklebern helfen bei der späteren Zuordnung.

## Sicherheits- und Erstcheck

Das Handbuch ist eine fahrzeugbezogene Orientierung und keine aktuelle Freigabe für jede Wildfire. Vor der ersten Fahrt gehören deshalb die Angaben am eigenen Fahrzeug und die aktuelle Zulassung zusammen geprüft. Helm und geeignete Schutzkleidung sind selbstverständlich; außerdem sollten die jeweils erforderlichen Fahrzeug- und Versicherungsunterlagen mitgeführt werden.

Nach längerer Stand- oder Transportzeit empfiehlt die Handbuchfassung, den Akku einmal vollständig zu laden, damit die Ladezustandsanzeige wieder besser kalibriert ist. Vor dem Losfahren müssen Lichtanlage, Blinker, Hupe, Spiegel und Bremsen funktionieren. Für den Reifendruck nennen die vorhandenen Wildfire-Unterlagen unterschiedliche Werte; die passende Angabe für Reifen, Modellstand und Beladung am eigenen Fahrzeug ist maßgeblich.

Das Handbuch beschreibt sowohl vollständig montierte Fahrzeuge als auch die Lieferung im Karton auf einer Palette. Vor der ersten Fahrt ist trotzdem eine Kontrolle auf Transportschäden und lose oder beschädigte sicherheitsrelevante Bauteile erforderlich.

Die Wildfire hat sofort verfügbares Drehmoment und keine Kupplung. Wer erstmals elektrisch fährt, sollte deshalb mit dem sanftesten Fahrmodus beginnen. Die Hinweise des Handbuchs beziehen sich je nach Ausstattung auf Funkschlüssel, NFC, ein oder zwei Akkus sowie ein blaues oder ein TFT-Display — nicht jede Funktion ist an jedem Fahrzeug vorhanden.

## Technische Eckdaten aus den Community-Unterlagen

Die folgenden Werte helfen beim ersten Abgleich von Reichweite, Fahrmodus, Akku und Wartung. Sie stammen aus dem [Wildfire-Handbuch der Community](/pdfs/19-wildfire-handbuch-community.pdf), dem [Wartungshinweis](/pdfs/20-wildfire-wartung-community.pdf) und dem [Willkommenshinweis](/pdfs/01-wildfire-willkommenshinweis.pdf). Es gibt hier bewusst keine scheinbar einheitliche Hersteller-Tabelle: Die Dokumente beziehen sich auf unterschiedliche Stände und enthalten beim Reifendruck sogar abweichende Angaben.

### Reichweite, Fahrmodi und Akku

- **Reichweite:** ungefähr 60–120 km pro Akku, abhängig von Tempo, Gelände, Reifen, Reifendruck und Fahrergewicht.
- **Eco:** bis 90 km/h, 7 kW pro Akku und sanfte Beschleunigung.
- **Normal:** bis 100 km/h, 10 kW pro Akku.
- **Sport:** 17 kW pro Akku sowie 110 km/h mit einem Akku beziehungsweise 125 km/h mit zwei Akkus; im Dokument als Modus für kurze Strecken und Überholvorgänge beschrieben.
- **Ladetemperatur:** unter 0 °C nicht laden.
- **Lebensdauer:** ungefähr 800 Vollzyklen bis etwa 80 % Restkapazität; das ist ein Orientierungswert aus der Community-Dokumentation.
- **Spannungsanzeige:** Die Community-Tabelle ordnet 115 V ungefähr 100 % und 87 V ungefähr 0 % zu. Diese Werte nicht als universelle BMS- oder Controller-Grenzen übernehmen.

Die Reichweite sinkt vor allem mit steigender Durchschnittsgeschwindigkeit, weil der Luftwiderstand stark zunimmt. Der Sportmodus ist laut Handbuch eher für kurze Strecken und Überholvorgänge gedacht; dauerhafte hohe Leistung kann Akku und Motor stärker erwärmen und die Ladeleistung begrenzen.

Bei zwei Akkus kann ein deutlich unterschiedlicher Ladezustand die verfügbare Spitzenleistung vorübergehend reduzieren. Der Ausgleich erfolgt bei angeschlossenen Akkus automatisch, benötigt aber Zeit. Die Akkus sollten deshalb möglichst gemeinsam und mit ähnlichem Ladezustand betrieben werden.

Als grobe Ein-Akku-Orientierung nennt die Handbuchfassung etwa 120 km bei Stadtfahrten bis 60 km/h, 90 km bei einem Stadt-/Landstraßen-Mix bis 80 km/h, 75 km auf der Landstraße bis 90 km/h und 60 km bei ungefähr 100 km/h. Das sind Test- und Dokumentationswerte, keine Reichweitengarantie.

### Spannung unter Last und Abschaltung

Beim Beschleunigen kann die Batteriespannung kurzfristig deutlich abfallen. Dieser „Voltage Sag“ ist bei kalten Akkus und hoher Last stärker; dadurch kann der Balken im Display vorübergehend weniger Ladung anzeigen, als im Ruhezustand tatsächlich vorhanden ist. Für eine bessere Einschätzung die Spannung bei stehendem Fahrzeug oder in der Smart-BMS-App prüfen. Die im Handbuch genannten Spannungsabfälle von ungefähr 8 bis 12 V sind Orientierungswerte, keine Messgrenze für jedes Fahrzeug.

Die Unterlagen beschreiben außerdem eine Schutzabschaltung im unteren Spannungsbereich. Je nach Last, Zellbalance und Fahrzeugstand wird dafür ungefähr der Bereich von 85 bis 88 V genannt. Das ist keine universelle BMS- oder Controller-Grenze: Bei einer Abschaltung nicht wiederholt neu starten, sondern das Fahrzeug sicher abstellen und Akku, Ladezustand und Fehleranzeige fachkundig prüfen lassen.

### Rekuperation und Seitenständer

Beim Loslassen des Gasgriffs kann die Wildfire regenerativ bremsen. Langsames Zurücknehmen erzeugt eine schwächere, schnelles Zurücknehmen eine stärkere Verzögerung. Bei voller Batterie oder bestimmten Betriebszuständen kann die Rekuperation jedoch aussetzen — sie ersetzt daher keine funktionsfähige Bremse.

Der Seitenständer ist bei vielen Wildfire-Ausführungen mit einer Sicherheitsabschaltung verbunden. Solange er ausgeklappt ist, kann der Antrieb gesperrt sein. Eine Änderung an der Feder oder Abschaltung darf nicht als allgemeine Empfehlung verstanden werden, weil dadurch Zulassung und Sicherheit beeinflusst werden können.

### Reifen, Bremse und Pflege

- **Reifendruck:** Ein Dokument nennt 2,5 bar vorn und hinten. Ein anderer Abschnitt nennt mindestens 2,4 bar vorn und 2,6 bar hinten. Vor jeder Fahrt gilt die passende Vorgabe für das konkrete Fahrzeug und den montierten Reifen.
- **Bremse:** Die kombinierte Hinterrad-/Vorderradbremse liegt links am Lenker, die Vorderradbremse rechts; eine Fußbremse ist nicht vorgesehen.

Zusätzlich empfiehlt die Handbuchfassung vor jeder Fahrt, Reifenprofil, Speichen, Felgen, Achsen und Bremsscheiben auf sichtbare Schäden zu prüfen. Ein Reifenprofil von mindestens 3 mm wird als Orientierung genannt. Die Bremszangen und ihre Halterungen müssen fest und unbeschädigt sein, die Beläge ausreichend Material haben und der Bremsflüssigkeitsstand im Behälter sichtbar sein. Vor dem Losfahren beide Bremsen vorsichtig testen.

### Wartungswerte aus den Wildfire-Unterlagen

Die ausführlichere Handbuchfassung und die Zusammenfassung aus dem Forum nennen für die Wildfire zusätzlich eine wöchentliche beziehungsweise alle zehn Betriebsstunden empfohlene Reifendruckkontrolle. Als Orientierung werden mindestens 2,4 bar vorn und 2,6 bar hinten, höchstens 3,0 bar, genannt. Maßgeblich bleiben Reifen, Beladung, Modellstand und die Vorgabe am eigenen Fahrzeug.

Für einzelne Verschraubungen werden 150 Nm an der Hinterachse, 120 Nm an der Vorderachse, 30–40 Nm an der Schwingenachse sowie 5–20 Nm für bestimmte Klemm- und M6-Schrauben genannt. Diese Werte sind nicht pauschal auf jede Wildfire übertragbar: Vor dem Anziehen muss die konkrete Schraube, Baugruppe und Revision identifiziert werden.

Die ergänzende Pflegezusammenfassung führt folgende weitere Richtwerte auf. Sie dürfen nur mit passendem Drehmomentschlüssel, identifizierter Schraube und dem korrekten Fahrzeugstand verwendet werden:

| Baugruppe oder Verbindung | Dokumentierter Richtwert |
| --- | --- |
| Hinterachse | 120–150 Nm |
| Vorderachse | 120 Nm |
| Schwingenachse | 30–40 Nm |
| Lenkkopf, 30-mm-Mutter | 50–70 Nm |
| 6-mm-Inbus, unter anderem Lenker, Bremsen und Stoßdämpfer | 25 Nm |
| Bremsgriffe, 12-mm-Verbindung | 20–25 Nm |
| 5-mm-Inbus, unter anderem Kotflügel und hintere Schwinge | 15–20 Nm |

Für bestimmte M6-Edelstahlschrauben wird Torx 30 genannt. Werkzeuggröße allein ist jedoch keine Drehmomentfreigabe; Gewinde, Schraubenlänge, Material und Einbauort müssen vorher geprüft werden.

### Fahrwerk einstellen

Die Federvorspannung wird über den silbernen Einstellring verändert und mit der vorgesehenen Kontermutter gesichert. Mehr Vorspannung verringert das Einsinken beim Aufsitzen und lässt mehr nutzbaren Federweg. Die Zugstufe sitzt unten am Dämpfer; laut Pflegehinweis wird sie nach rechts langsamer. Wegen des schweren Nabenmotors wird eher eine schnelle Einstellung als Ausgangspunkt genannt. Die passende Einstellung hängt aber von Beladung, Fahrergewicht und Dämpferversion ab.

Für die Kontrolle der Speichen wird ein passender Speichenschlüssel benötigt. Lose, verbogene oder beschädigte Speichen sowie auffällige Felgen oder Lager sind kein Fall für eine Probefahrt, sondern müssen vor der Weiterfahrt fachkundig geprüft werden.

### Wartungsrhythmus

Die im Handbuch aufgeführte Checkliste lässt sich so zusammenfassen:

| Intervall | Wichtige Prüfpunkte |
| --- | --- |
| Vor jeder Fahrt | Spiegel, Akkuanschluss, Licht, Blinker, Hupe, Rück-/Bremslicht und Reifendruck |
| Nach 10 Betriebsstunden | Drehmoment an Gabel, Achsen, Lenker, Bremsen und Federung; Reifen, Felgen, Speichen und Bremsscheiben |
| Nach 20 Betriebsstunden | Bremsbeläge, Bremsscheibenschrauben und Fußrasten |
| Alle 6 Monate | Bremsflüssigkeit, Bremsschläuche, Vorder- und Lenkkopflager, Batteriestecker, Rahmen und allgemeiner Reinigungszustand |

Die erste größere Inspektion wird in der Quelle nach 12.000 km oder innerhalb der ersten zwei Jahre genannt, danach erneut alle 12.000 km. Diese Intervalle sind ein historischer Handbuchstand und müssen mit der konkreten Fahrzeugrevision, dem tatsächlichen Einsatz und einer qualifizierten Werkstatt abgeglichen werden.

Diese Angaben sind für die Vorauswahl und das Gespräch mit einer Werkstatt nützlich. Sie ersetzen weder die Prüfung von Modelljahr, Softwarestand und Akkuanzahl noch eine Freigabe für Reifen, Bremsen, Controller oder Ersatzteile.

## Motorrad-Übersicht und Bedienung

### Kennzeichnungen, Akku und Bluetooth

Die 17-stellige FIN ist am Rahmen eingeprägt und zusätzlich auf dem vorgeschriebenen Typenschild angegeben. In der bereitgestellten Wildfire-Handbuchfassung wird die Position oberhalb der Fußraste auf der rechten Rahmenseite beschrieben. Die Nummer und das Typenschild dürfen nicht verändert oder entfernt werden.

Die Seriennummer der Batterie ist bei eingebautem Akku nicht sichtbar. Die Motornummer sitzt links am Motorgehäuse und ist lasergraviert; die Leistungsangabe auf dem Motor muss nicht der Leistung des gesamten Fahrzeugs entsprechen. Die Seriennummer des Controllers befindet sich oben am Gehäuse und wird meist erst nach dem Abnehmen einer Seitenabdeckung sichtbar.

Je nach Akkuausführung schaltet ein Knopf am Batteriegehäuse die Bluetooth-Funktion ein. Bluetooth verbraucht Energie und sollte bei längerer Standzeit ausgeschaltet werden, wenn es nicht benötigt wird.

### Bedienelemente am Lenker

Von rechts nach links nennt das Handbuch Gasgriff, Fahrmodusschalter, Kill-Switch mit Starter, Display sowie die Schalter für Licht und Hupe. Anders als bei einem klassischen Verbrenner gibt es keine Kupplung. Die kombinierte Hinterrad-/Vorderradbremse liegt links am Lenker, die Vorderradbremse rechts.

### Funkschlüssel und NFC

Der Funkschlüssel besitzt vier Funktionen: Alarm, Ausschalten, Suchen und Einschalten. Die genaue Anordnung kann je nach Schlüsselversion abweichen; die Symbole am eigenen Schlüssel sind maßgeblich. Fahrzeuge mit NFC können über eine NFC-Karte und — je nach Modul — zusätzlich über ein gekoppeltes Smartphone gestartet werden. Ohne NFC-Modul oder passende Fahrzeugrevision gilt diese Funktion nicht.

## Zulassung und Unterlagen

Für die Anmeldung nennt die Handbuchfassung je nach Land unterschiedliche Dokumente. Für Deutschland werden insbesondere CoC-Papier, Rechnung mit FIN, Versicherungsbestätigung beziehungsweise eVB-Nummer und Ausweis genannt. Als historische Suchhilfe führt die Quelle außerdem HSN 2265 und TSN AAD auf; diese Angaben müssen vor der Anmeldung mit Versicherung und Zulassungsstelle abgeglichen werden.

Bei Importen nach Österreich, in die Schweiz oder nach Frankreich können zusätzlich nationale Genehmigungs-, Zoll-, Steuer- oder Prüfunterlagen erforderlich sein. Die Anforderungen und Gebühren ändern sich. Deshalb immer die zuständige Behörde und Versicherung nach dem aktuellen Verfahren fragen; die alte Handbuchfassung ersetzt keine Rechts- oder Zulassungsberatung.

## Fahrzeugbetrieb

### Vorbereitung

Vor dem Start muss der Akku beziehungsweise müssen beide Akkus korrekt angeschlossen und eingeschaltet sein. Bei Fahrzeugen mit zwei Akkus sollten beide möglichst denselben Ladezustand haben. Die ergänzende Pflegezusammenfassung beschreibt den Ladeanschluss hinter dem rechten Staufach, das mit dem kleinen schwarzen Schlüssel geöffnet wird. Der Batterieschalter sitzt je nach Ausführung links beziehungsweise vorn unter der Tankabdeckung. Nach einem Akku-Ausbau kann der Zugang über Tankabdeckung oder Seitentür erfolgen; Schrauben, Sicherungen und Stecker werden in der für das eigene Fahrzeug vorgesehenen Reihenfolge gelöst.

Vor jeder Fahrt: Licht, Bremslicht, Blinker, Hupe, Rückspiegel und Reifendruck kontrollieren. Die Pflegezusammenfassung nennt 2,5 bar als Richtwert und höchstens 3 bar am Hinterrad; andere Wildfire-Unterlagen nennen mindestens 2,4 bar vorn und 2,6 bar hinten. Maßgeblich sind Reifen, Modellstand, Beladung und die Vorgabe am eigenen Fahrzeug.

Alle Schlösser müssen entriegelt sein. Für das Lenkradschloss wird der große schwarze Schlüssel verwendet. Die Wildfire kann beim Aufrichten einen automatisch hochklappenden Seitenständer haben. Beim Abstellen und Aufrichten deshalb immer für sicheren Halt sorgen und das Motorrad nicht unbeaufsichtigt auf dem Ständer loslassen.

### Starten mit dem Funkschlüssel

1. Mit der Taste mit dem offenen Schloss einen eventuell aktiven Alarm beenden.
2. Die Einschalttaste mit dem Blitzsymbol zweimal drücken.
3. Wenn Display und Beleuchtung aktiv sind, aufsteigen und den Seitenständer vollständig einklappen.
4. Prüfen, dass der rote Kill-Switch nicht gedrückt ist, und anschließend den Starter betätigen.
5. Sobald der Fahrmodus angezeigt wird, ist der Antrieb freigegeben. Bei einem Startproblem zuerst Seitenständer, Kill-Switch, Akkuanschlüsse und Fehlersignale prüfen — nicht wiederholt unter Last starten.

### Starten mit NFC oder Smartphone

Mit einer NFC-Karte wird der Start-/Stopp-Schalter berührt. Beim ersten Einsatz muss der genaue Lesepunkt gesucht werden. Bei kompatiblen Fahrzeugen kann anschließend ein Smartphone über Bluetooth gekoppelt werden. Die Handbuchfassung beschreibt dafür den Modulnamen `HTbdb_Hid`, eine kurze Lernsequenz am Start-/Stopp-Schalter und die Verbindung innerhalb weniger Sekunden. Bis zu fünf Smartphones können laut Quelle hinterlegt werden.

Ein gekoppeltes Smartphone kann in Reichweite den Startvorgang ermöglichen. Bluetooth daher deaktivieren oder ausreichend Abstand zum abgestellten Fahrzeug halten, damit niemand in der Nähe unbeabsichtigt eine Startfreigabe erhält.

### Fahrt beenden

1. Den aktiven Fahrmodus über den roten Kill-Switch beenden.
2. Absteigen, den Seitenständer ausklappen und den sicheren Stand prüfen.
3. Mit der Taste mit dem offenen Schloss Display und Beleuchtung abschalten.
4. Batterie ausschalten, sofern sie im Fahrzeug bleibt und die Ausführung das vorsieht.
5. Mit der Taste mit dem geschlossenen Schloss die Alarmanlage aktivieren. Die Lautsprechertaste kann je nach Fernbedienung einen Signalton auslösen. Für das Abstellen im öffentlichen Raum empfiehlt das Handbuch zusätzlich ein geeignetes externes Schloss und das Verriegeln des Lenkers.

## Laden, Batterie und Zelltechnik

### Akku entnehmen

Vor dem Ausbau muss die Wildfire sicher stehen und der Akku ausgeschaltet sein. Je nach Fahrzeugstand wird der Zugang über die Tankabdeckung oder eine Seitentür geöffnet. Beim beschriebenen Tankzugang werden zunächst drei Rändelschrauben gelöst und die Abdeckung sicher abgelegt.

Den Akku vom Fahrzeug trennen und die Kontakte des Steckers so ablegen, dass sie weder den Rahmen noch andere leitende Teile berühren. Erst danach den Akku am vorgesehenen Griff herausheben. Ein heruntergefallener oder sichtbar beschädigter Akku darf nicht weiter geladen oder benutzt werden; er muss fachkundig beurteilt werden.

### Laden und Wiedereinsetzen

Beim Laden zuerst die Stromversorgung und anschließend den Akku beziehungsweise den Fahrzeuganschluss nach der zum Ladegerät passenden Reihenfolge verbinden. Das Ladegerät kann während des Betriebs hörbar sein. Bei leistungsstärkeren 6,6- oder 9-kW-Ladegeräten muss das Fahrzeug laut Handbuch zum Aufbau der Kommunikation zunächst eingeschaltet sein; sobald der Ladevorgang läuft, kann es ausgeschaltet werden. Das Ladekabel wird zum Beenden zuerst am Fahrzeug und danach an der Stromquelle getrennt.

Zum Wiedereinsetzen den Akku zunächst ausschalten, einsetzen und anschließen. Bei zwei Akkus den zweiten Stecker besonders sorgfältig behandeln: Metallkontakte dürfen weder berührt werden noch den Fahrzeugrahmen berühren. Anschließend die Batterie einschalten, Sicherung beziehungsweise Abdeckung in die Betriebsstellung bringen und den Zugang wieder sicher verschließen.

### Lademöglichkeiten und Ladeablauf

Die Pflegezusammenfassung unterscheidet Laden an einer Schuko-Steckdose, Laden über eine Wallbox und Laden an einer öffentlichen Ladesäule. Entscheidend ist dabei nicht allein die Leistung der Steckdose oder Säule, sondern ob Ladegerät, Fahrzeuganschluss, Kabel, Absicherung und eingestellter Ladestrom zusammenpassen. Eine Wallbox oder Ladesäule macht ein ungeeignetes Ladegerät nicht automatisch passend.

Vor dem Laden den Akku nach einer Fahrt abkühlen lassen und den vorgesehenen Anschluss am Fahrzeug öffnen. Beim Laden über den Anschluss hinter dem rechten Staufach wird der kleine schwarze Schlüssel benötigt. Den Ladevorgang am Ladegerät beziehungsweise an der Säule starten und die Ladeanzeige beobachten. Zum Beenden zuerst die Verbindung am Fahrzeug lösen und danach die Stromquelle trennen. Ladegerät und Stecker nicht unbeaufsichtigt bei sichtbaren Schäden, Nässe oder ungewöhnlicher Hitze weiterbetreiben.

### Ladeleistung und Rekuperation

Die bereitgestellten Wildfire-Unterlagen beschreiben die Einstellung „Maximaler Ladestrom“ als Stromwert auf der Akku-Seite. Die dort genannten 8, 16, 32 und 64 A sind deshalb nicht einfach mit dem Strom einer 230-V-Haushaltssteckdose gleichzusetzen. Für einen dokumentierten 110-V-Akku und das dort verwendete Ladegerät werden ungefähr 0,9 kW, 1,8 kW, 3,6 kW und 6,6 kW Ladeleistung als Beispiele genannt.

- Haushaltssteckdosen sollten in den Unterlagen möglichst mit etwa 2 kW belastet werden; Ladegerät, Leitung und Absicherung müssen trotzdem zusammenpassen.
- An einer 11-kW-Ladesäule ist häufig nur ein begrenzter Anteil je Phase nutzbar. Eine 22-kW-Säule kann je nach Fahrzeug- und Ladegerätkonfiguration mehr Leistung bereitstellen, macht aber kein ungeeignetes Ladegerät passend.
- Eine Begrenzung des Ladestroms kann auch die zulässige Rekuperation begrenzen. Als Dokumentationshilfe werden 10 A bei 8 A Ladestrom, 20 A bei 16 A und 40 A bei 32 A genannt. Das sind keine universellen Einstellwerte.

### Einzelzelle ist nicht Akkupack

Das zusätzlich bereitgestellte BAK-Datenblatt beschreibt eine einzelne N21700CG-50-Zelle: 5.000 mAh Nennkapazität, 3,60 V Nennspannung, 4,20 V Ladeschlussspannung und 2,50 V Entladegrenze unter den dort beschriebenen Laborbedingungen. Es nennt außerdem 0–45 °C als Ladebereich, −20–60 °C als Entladebereich, höchstens 30 mΩ Wechselstrom-Innenwiderstand und eine Lagerung von 3,50–3,80 V pro Zelle.

Diese Werte belegen weder den Aufbau noch die Freigabe eines Wildfire-Akkupacks. Anzahl und Verschaltung der Zellen, BMS, Sicherungen, Stecker, Gehäuse, Ladegerät und Fahrzeugsoftware müssen separat geprüft werden. Einzelzellen dürfen nicht selbst aus einem Pack ausgebaut, gemischt oder ersetzt werden.

### Ladezustand, Kalibrierung und Balancing

Beim älteren Display nennt die Handbuchfassung folgende grobe Zuordnung der Ruhespannung zum Ladezustand eines dokumentierten 110-V-Systems:

| Angezeigter Ladezustand | Handbuchfassung, ungefähr | Ergänzende Pflegezusammenfassung, ungefähr |
| --- | --- | --- |
| 100 % | 115 V | 117 V |
| 80 % | 107 V | 108 V |
| 60 % | 102 V | 102 V |
| 40 % | 100 V | 100 V |
| 20 % | 96 V | 95 V |
| 0 % | 87 V | 86 V |

Beide Tabellen sind nur grobe Ruhespannungs-Orientierungen aus unterschiedlichen Dokumentständen; die Anzeige kann laut Quelle um etwa ±0,4 V abweichen. Während der Fahrt verändert sich die Spannung durch Last und Rekuperation, deshalb ist die Tabelle nur im Stillstand sinnvoll. Bei Abweichungen nicht zwischen den Werten mitteln, sondern die Anzeige des konkreten Fahrzeugs mit der Smart-BMS-App und dem passenden Handbuchstand abgleichen.

Nach mehr als etwa sieben Tagen Standzeit kann die Anzeige vom tatsächlichen Ladezustand abweichen, weil kleine Verbraucher wie ein NFC-Modul nicht immer vollständig in die BMS-Berechnung einfließen. Das Handbuch empfiehlt vor der nächsten Fahrt eine vollständige Ladung. Eine manuelle Korrektur in der BMS-App ist nur eine Schätzung und darf nicht ohne Kenntnis des konkreten Akkus vorgenommen werden.

Beim vollständigen Laden kann das BMS die Zellspannungen automatisch ausgleichen. Dieser Balancing-Vorgang läuft langsam und kann bis zum Ende des Ladevorgangs dauern. Zwei Akkus mit unterschiedlichem Ladezustand können sich bei angeschlossenem Fahrzeug gegenseitig angleichen; bis dahin kann die Spitzenleistung reduziert sein.

### Batteriepflege und Temperatur

Lithium-Ionen-Akkus müssen nicht nach jedem Zyklus vollständig entladen werden. Für eine lange Lebensdauer empfiehlt die Handbuchfassung eher einen mittleren Arbeitsbereich, etwa 20 bis 80 Prozent. Den Akku nicht absichtlich bis 0 Prozent entladen; gelegentlich ist eine vollständige Ladung zur Kalibrierung und zum Balancing sinnvoll. Nach der Fahrt sollte der Akku ungefähr eine Stunde abkühlen, bevor geladen wird; auch nach dem Laden ist eine kurze Ruhephase sinnvoll. Einen vollständig geladenen Akku nicht länger als nötig am Ladegerät lassen.

Nur das für den Akku vorgesehene Ladegerät verwenden. Stecker sauber und trocken halten, nicht kurzschließen und einen Akku weder öffnen, fallen lassen, in Wasser tauchen noch mit sichtbaren Schäden laden. Ein gefrorener Akku muss langsam auf über 0 °C beziehungsweise Raumtemperatur kommen; er darf nicht schnell erwärmt oder sofort geladen werden.

Für einen möglichst schonenden Betrieb nennt die Quelle einen Temperaturbereich von ungefähr 10 bis 55 °C. Unter 5 °C kann der Spannungseinbruch stärker werden und die Reichweite bei kalter Fahrt sinken. Bei einer Akkutemperatur über 55 °C darf nicht geladen werden; direkte Sonne und Laden unmittelbar nach hoher thermischer Belastung sollten vermieden werden.

Für die Lagerung nennt das Handbuch etwa 40 bis 50 Prozent Ladezustand, einen trockenen Ort bei Raumtemperatur und Schutz vor direkter Sonne. Den Akku nicht dauerhaft leer, voll am Ladegerät oder gemeinsam mit dem Ladegerät an der Steckdose lagern. Unter 0 °C darf nicht geladen werden; kalte Akkus können außerdem vorübergehend weniger Leistung und Reichweite liefern.

### Ladegerät pflegen

Das Ladegerät trocken, stoßgeschützt und in Innenräumen aufbewahren. Lüftungsöffnungen und Lüfter müssen frei bleiben; das Gehäuse kann mit einem weichen, trockenen Tuch gereinigt werden. Eine passende Ersatzsicherung bereitzuhalten, kann im Fehlerfall hilfreich sein. Bei beschädigtem Kabel, Stecker oder Gehäuse das Ladegerät nicht weiterverwenden.

### Smart-BMS-App

Die im Handbuch genannte Smart-BMS-App kann — sofern Akku und Fahrzeugstand sie unterstützen — unter anderem Ladezustand, Spannung, Strom, Batteriegesundheit, Zellspannungen, Spannungsdifferenzen, Ladeleistung und Ladezyklen anzeigen. Dafür müssen die Akkus eingeschaltet sein; das Motorrad selbst muss nicht zwingend laufen.

Die App ist in erster Linie ein Diagnose- und Anzeigeinstrument. Einstellungen für Zellcharakteristik, Schutzgrenzen oder Balancing sollten nicht verändert werden. Vorhandene Standard-Zugangsdaten sollten durch ein eigenes Passwort ersetzt werden, ohne sie öffentlich zu dokumentieren.

## FarDriver, Leistung und Einstellungen

### Line Current, Phase Current und Wärme

Die Community-Dokumente unterscheiden zwei Strombegriffe. Der **Line Current** beschreibt den Batteriestrom und wirkt sich vor allem auf Beschleunigung bei höherem Tempo und die mögliche Dauerleistung aus. Der **Phase Current** beeinflusst vor allem Anfahrmoment und Beschleunigung bei niedriger Geschwindigkeit. Höhere Werte erhöhen die thermische Belastung von Akku, Motor und Controller.

In den Unterlagen stehen je nach Controllerstand unterschiedliche Bereiche: ältere Controller werden beispielsweise mit etwa 70–130 A bei einem Akku und 140–260 A bei zwei Akkus beim Line Current beschrieben; für neuere Stände werden niedrigere Bereiche genannt. Beim Phase Current reichen die dokumentierten Bereiche ebenfalls von etwa 300–450 A bis 400–650 A. Das sind historische Community-Einstellungen, keine Empfehlung für jedes Fahrzeug.

Für die grobe elektrische Plausibilitätsprüfung gilt: Eingangsleistung ist näherungsweise Batteriespannung × Batteriestrom. Phasenstrom darf nicht einfach als zusätzlicher Batteriestrom zur Leistung addiert werden. Die maximal mögliche Leistung hängt außerdem von Akkuabsicherung, Spannungseinbruch, Temperatur, BMS und Controllerbegrenzung ab.

### Controller-Einstellungen sicher einordnen

Die FarDriver-App und die Bluetooth-Verbindung gehören immer zu einem konkreten Controller- und Softwarestand. Werte aus einem Spickzettel oder aus dem Forum dürfen nicht blind übernommen werden. Vor jeder Änderung müssen Akkuzahl, Controllerrevision, Firmware, Sicherung, Motordaten und die Folgen für Temperatur und Rekuperation dokumentiert werden. Änderungen an Hochstrom- und Antriebsparametern gehören in qualifizierte Hände.

Eine passende Controller-App kann laut Handbuch Werte wie Rekuperation, Spitzen- und Dauerleistung, Drehmoment, Höchstgeschwindigkeit, Gasgriffempfindlichkeit und Fahrmodi anzeigen oder verändern. Sie kann außerdem Controller- und Motortemperatur sowie Leistungsdaten ausgeben. Für den Zugriff kann ein Bluetooth-Dongle erforderlich sein. Das Auslesen von Daten ist von einer Parameteränderung zu trennen; Änderungen an der Antriebsseite gehören in qualifizierte Hände.

### Software-Konfiguration Version 1.2, Juli 2025

Die [lokale Software-Konfiguration](/pdfs/04-wildfire-software.pdf) ist laut Dokument für Wildfires gedacht, die bis Ende August 2025 ausgeliefert wurden. Spätere Controller-, Akku- oder Firmwarestände können andere Grenzen und Bezeichnungen haben. Die folgenden Bereiche dokumentieren den historischen Stand zur Diagnose und zum Abgleich — sie sind keine allgemeine Tuning-Empfehlung. Außerhalb der ausdrücklich genannten Werte sollen laut Quelle keine weiteren Einstellungen verändert werden.

#### Batteriestrom und Phasenstrom

Für `MaxLineCurr` nennt die Version 1.2 bei einer Batterie 70–130 A und bei zwei Batterien 140–260 A. Mehr Batteriestrom kann die Beschleunigung bei höherem Tempo und das Halten einer hohen Geschwindigkeit verbessern, erhöht aber die thermische Belastung des Akkus und kann die Ladezeit beeinflussen. Die Quelle bezieht sich dabei auf eine Tachometeranzeige bis ungefähr 132 km/h; das ist keine allgemeine Höchstgeschwindigkeits- oder Zulassungsangabe.

Für `MaxPhaseCurr` werden 300–450 A genannt. Mehr Phasenstrom erhöht vor allem das Anfahrdrehmoment und die Beschleunigung bis ungefähr 20 km/h, erwärmt aber den Motor stärker. Nach längerer sportlicher Fahrt kann der Controller die Leistung ab etwa 130 °C automatisch reduzieren. Die Temperaturbegrenzung ist eine Schutzfunktion und kein Fehler, den man durch höhere Werte umgehen sollte.

#### Gasgriff und Stromverlauf über die Drehzahl

Bei `Throttle Sensitivity` unterscheidet die Konfiguration die Kennlinien Eco, Line und Sport. `Throttle Low` wird mit 0,6–1,0 V angegeben; ein niedrigerer Wert lässt den Gasgriff früher ansprechen. Für den Phasenstrom beschreibt die Quelle einen Bereich von 500 bis 4.000 angezeigten RPM. Die tatsächliche Motordrehzahl wird dort mit etwa einem Viertel der Anzeige angegeben.

Ein gleichbleibender Phasenstrom bis zur hohen Drehzahl liefert zwar maximale Beschleunigung, erwärmt den Motor aber schnell. Als thermisch schonendere Dokumentationsvariante beschreibt die Quelle einen schrittweisen Abfall — etwa in 2- oder 3-Prozent-Schritten — bis zu mindestens 50 Prozent. Das ist nur eine Einordnung der vorhandenen Konfiguration; Änderungen gehören in fachkundige Hände.

In Eco und Normal können `LowSpeedLineRatio`, `MidSpeedLineRatio`, `LowSpeedPhaseRatio` und `MidSpeedPhaseRatio` jeweils mit 20–100 Prozent begrenzen, wie viel Batterie- und Phasenstrom anliegt. Die dokumentierten Drehzahlbereiche liegen bei 500–4.000 RPM. Damit lassen sich Fahrgefühl, Leistung und Höchstgeschwindigkeit begrenzen, ohne die Grundkonfiguration als universell passend anzusehen.

#### Rekuperation

Für eine Batterie nennt die Software-Datei `StopBackCurr` mit 0–20 A und `MaxBackCurr` mit 5–25 A. Bei zwei Batterien werden 0–40 A beziehungsweise 5–45 A genannt. `MaxBackCurr` soll dabei mindestens 5 A über `StopBackCurr` liegen; höhere Werte erzeugen grundsätzlich stärkere Rekuperation.

Auch die Rekuperationsstärke kann über 500–4.000 RPM verteilt werden. Als Beispiel wird ein ansteigender und wieder abfallender Verlauf („Pyramide“) mit 15, 30, 60, 100, 100, 60, 30 und 15 Prozent beschrieben. Rekuperation darf die mechanische Bremse nicht ersetzen und muss zu Akku, Ladezustand, Reifen und Controller passen.

#### Fahrgefühl und Unterspannungsschutz

`PC13` wird mit den Varianten Normal oder Racing response beschrieben. Der Auslieferungsstand ist laut Quelle Normal; Racing macht den Gasgriff nervöser und die Rekuperation direkter. Das ist eine Komfort- und Reaktionsänderung, keine Leistungsfreigabe.

`LowVoltageProtect` wird für diesen Softwarestand mit 86–90 V angegeben. Ein niedrigerer Schutzwert kann bei niedrigem Ladezustand etwas mehr nutzbare Reichweite ermöglichen, erhöht unter hoher Last aber die Gefahr einer Abschaltung. `Low Vol Way` wird als `1-Vol4V` oder `2-Vol6V` beschrieben; der höhere Wert begrenzt die Leistung früher, um den Akku bei niedrigem Ladezustand stärker zu schonen.

Die Werte überschneiden sich teilweise mit den Spannungsbereichen aus anderen Wildfire-Dokumenten, sind aber nicht automatisch identisch. Bei Abschaltungen, ungewöhnlicher Wärme oder reduziertem Drehmoment nicht einfach Parameter ändern, sondern Akku, Zellbalance, Controllerstand und Fehlerbild dokumentieren und fachkundig prüfen lassen.

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

### Notbetrieb und thermische Schutzfunktionen

Im Notbetrieb leuchtet die Motorkontrollleuchte und das Fahrzeug fährt mit deutlich reduziertem Drehmoment. Eine solche Leistungsreduzierung kann durch zu niedrige Batteriespannung, einen überhitzten Motor oder Controller, eine zu warme oder zu kalte Batterie oder einen unplausiblen Gasgriff ausgelöst werden. Bei thermischer Begrenzung das Fahrzeug abstellen und abkühlen lassen; bei wiederkehrenden Meldungen die Ursache fachkundig prüfen lassen.

### Anzeige und Software

Anzeige, Controller, Bluetooth-Modul und Softwarestand müssen als zusammengehörige Konfiguration betrachtet werden. Ein Ersatzteil mit gleichem Namen kann wegen Stecker, Protokoll, Firmware oder Halterung trotzdem nicht passen. Vor einer Nachrüstung deshalb Typenschild, Steckverbindung, Einbaumaß und vorhandene Software dokumentieren.

### Frühes CT-22-Display

Für frühe Wildfire mit blauem CT-22-Display werden Ladezustand, Batteriespannung, Fahrmodus, Geschwindigkeit, Tages- und Gesamtkilometer sowie die Uhrzeit angezeigt. In der unteren Statusleiste stehen je nach Fahrzeugstand linker Blinker, Fahrmodus, Fernlicht und rechter Blinker.

Die beiden Tasten links am Display dienen als Einstell- und Auswahltaste. Die Taste **ADJ** setzt den Tageskilometerzähler nach längerem Drücken zurück; **SET** kann bei langem Drücken zwischen km/h und mph umschalten. Die Uhr wird bei ausgeschaltetem Fahrzeug über die Einstelltaste aufgerufen und anschließend mit ADJ und SET verändert. Diese Zuordnung kann bei anderen Displayständen abweichen.

Das CT-22 besitzt außerdem ein passwortgeschütztes Service- und Kalibriermenü für Geschwindigkeits-, Kilometer- und Ladeanzeige. Diese Werte sind keine normalen Benutzereinstellungen. Eine falsche Kalibrierung kann die Anzeige verfälschen; deshalb hier keine pauschalen Werte oder Änderungsanleitung für fremde Fahrzeuge.

### TFT-Display, USB und Smartphone-Anbindung

Bei Wildfire-Ausführungen mit TFT-Display können neben Ladezustand, Batteriespannung, Geschwindigkeit und Kilometerstand auch Smartphone-Funktionen wie CarPlay oder Android Auto vorgesehen sein. Ein USB-Anschluss sitzt je nach Ausführung rechts oder links am Steuerrohr. Er kann zum Laden des Smartphones und — sofern vom Display unterstützt — für Softwareaktualisierungen dienen.

Für ein Display-Update nennt das Handbuch einen leeren USB-Stick, auf den ausschließlich die unveränderte passende `.bin`-Datei kopiert wird. Der Stick wird vor dem Einschalten angeschlossen und nach abgeschlossenem Update vor dem nächsten Start wieder entfernt. Firmware-Dateien dürfen nicht von einer anderen Displayrevision übernommen werden.

Die Bluetooth-Kopplung für CarPlay oder Android Auto erfolgt erst bei eingeschaltetem Motorrad und kann einige Minuten dauern. Displaytyp, Softwarestand, Stecker und Einbaumaße vor einer Nachrüstung dokumentieren; ein gleich klingender Ersatz ist nicht automatisch kompatibel.

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

## Besitz, Reinigung und Lagerung

### Reinigung und Rostvorsorge

Vor der Reinigung muss die Wildfire sicher stehen und vollständig ausgeschaltet sein. Elektrische Bauteile dürfen nicht mit Hochdruck oder einem Wasserschlauch behandelt werden. Für die normale Pflege eignen sich ein feuchtes Tuch und eine weiche Bürste; Wasser darf nicht in Stecker, Akku, Controller oder Display gelangen. Der Halter bleibt für Pflege und Rostvorsorge verantwortlich und sollte das Fahrzeug regelmäßig auf Korrosion prüfen.

### Längere Standzeit

Das Handbuch empfiehlt, die Wildfire mindestens einmal im Monat zu bewegen, damit bewegliche und sicherheitsrelevante Komponenten nicht ausschließlich ungenutzt stehen. Für längere Lagerung das Motorrad trocken, gut belüftet und vor direkter Sonne geschützt abstellen. Ein leerer Akku ist zu vermeiden; für den entnommenen Akku nennt die Quelle etwa 40 bis 50 Prozent Ladezustand. Akku und Ladegerät nicht dauerhaft gemeinsam an der Steckdose lassen.

Hohe Luftfeuchtigkeit begünstigt Rost. Bei kalter Lagerung darf der Akku nicht unter 0 °C geladen werden. Wenn der Akku im Fahrzeug bleibt, müssen die für die jeweilige Wildfire vorgesehene Trennung vom Controller und die Abdeckung sicher ausgeführt werden.

### Alarmanlage und Lenkradschloss

Wenn die Akkus im Fahrzeug bleiben und ein Funkschlüssel vorhanden ist, kann die Alarmanlage über die Alarmtaste aktiviert und über die Ausschalttaste deaktiviert werden. Das ist kein Ersatz für ein geeignetes externes Motorradschloss. Beim Abstellen im öffentlichen Raum: Wildfire ausschalten, Lenker verriegeln, Schlüssel mitnehmen und die Akkus nach Möglichkeit entnehmen.

Das Lenkradschloss sitzt unter der Gabelbrücke zwischen den Gabeln. Zum Verriegeln den Lenker vollständig nach links drehen, den Schlüssel in das Schloss auf der rechten Seite stecken und drehen. Vor jeder Fahrt muss das Schloss vollständig entriegelt sein.

### Unfall und Service

Nach einem Unfall die Wildfire auf sichtbare und strukturelle Schäden prüfen. Wenn Rahmen, Fahrwerk, Bremsen, Räder, Akku, Kabel oder das Fahrverhalten auffällig sind, die Fahrt beenden und das Fahrzeug nicht weiter betreiben. Sicherheitskritische Schäden gehören in eine Fachwerkstatt. Für eine Anfrage helfen Fotos, Fehlercodes, Fahrzeugstand, Akkuanzahl und eine kurze Beschreibung des Unfallhergangs.

Die im alten Handbuch beschriebenen Garantie- und Servicebeispiele sind historische Herstellerangaben. Sie sind keine Zusage für heutige Reparatur-, Garantie- oder Ersatzteilverfügbarkeit und sollten wegen des aktuellen Unternehmens- und Verfahrensstands gesondert geprüft werden.

> Sicherheitskritische Arbeiten an Akku, Hochvolt, Bremsen, Fahrwerk und Antrieb gehören in qualifizierte Hände.
