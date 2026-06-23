# RAAM · Race Across America — Redesign (Public Demo)

Konzept-Redesign der alten Menü-Seite von [raceacrossamerica.org](https://www.raceacrossamerica.org/raamweb/raam_menu/)
als moderne One-Page-Site — im Stil des **sipgate Panda Design System** (wie `alex-toolbox`).
Kein Framework, kein Build-Step: reines HTML/CSS/JS.

> **Öffentliche Demo-Variante.** Die lizenzierte Hausschrift PX Grotesk ist hier durch die
> freie **Space Grotesk** (+ **JetBrains Mono**) ersetzt, damit nichts Lizenziertes öffentlich
> ausgeliefert wird. Die fidelity-treue Version mit PX Grotesk liegt im privaten Repo.

## Struktur

```
raam-redesign-demo/
├── index.html        # Markup; lädt Space Grotesk + JetBrains Mono (Google Fonts)
├── css/styles.css    # Panda-Tokens, Layout, Komponenten, Responsive
└── js/main.js        # Theme-Toggle, Scroll-Spy, Reveal, Counter, Progress
```

## Design-System (Panda)

- **Farben:** NeoColors — Paper/Ink-Flächen, **Lime `#DEFF00`** als einziger Akzent.
  Lime erscheint **nie als Textfarbe** (nur Borders, Backgrounds mit Ink-Text, Icon-/Flächen-Fills,
  kurze Eyebrows). Text-Akzent ist Oliv `#5b7000` (Light) bzw. Lime-Pastell (Dark).
- **Typo:** Space Grotesk überall, JetBrains Mono für Zahlen/Daten/Tabellen (Demo-Ersatz für PX Grotesk).
- **Flächen:** flach, 1px-Rules, Radius 4/6/8 — keine Gradients, kein Glas.
- **Themes:** Light (Default) + Dark (sipgate Festival), Toggle gemerkt in `localStorage['raam-theme']`.
- Signatur: **Highlighter-Stroke** (Lime-Balken hinter der `<em>`-Headline).

## Mapping zur Original-Navigation

| Original-Menü                    | Neue Sektion                              |
|----------------------------------|-------------------------------------------|
| Home                             | Hero + Stat-Strip                         |
| Racers → Race Roster             | `#racers` (tool-tiles, fünf Klassen)      |
| Race Coverage → Results          | `#ergebnisse` (Rekord-Tiles)              |
| Race Coverage → TimeStation Data | `#tracking` (Live-Leaderboard, row-table) |

Zusätzlich: `#strecke` mit Höhenprofil (SVG) und `#faq`.

## Features

- **Interaktive Live-Karte** (Leaflet + CARTO-Tiles): Route Oceanside→Annapolis, animierte Fahrer-Marker, Start/Ziel + TimeStations, Leaderboard-Zeile klicken fokussiert den Fahrer
- Animiertes Höhenprofil West→Ost mit TimeStation-Markern
- Live-Leaderboard im Panda-`row-table`-Stil mit Status-Chips (Teal = unterwegs, Amber = Pause)
- Scroll-Progress, Scroll-Spy (aktiver Nav-State in Lime), Reveal-Animationen, animierte Zähler
- Voll responsive inkl. Masthead-Reflow auf Mobile
- `prefers-reduced-motion` wird respektiert

## Lokal ansehen

```bash
npx serve . -l 8094
# oder
python3 -m http.server 8094
```

> Inhalte (Racer, Zeiten, Rekorde) sind beispielhaft. Nicht offiziell mit RAAM verbunden.
