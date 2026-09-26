# AI-tananyagok

Ingyenes, magyar nyelvű AI-tananyagok az alapoktól a kutatói szintig:
https://csaplard.github.io/

| Útvonal | Anyag |
|---|---|
| `/` | nyitóoldal (központ) |
| `/llm-oktatoanyag/`, `/en/` | LLM-tananyag — külön repóban: `csaplard/llm-oktatoanyag` |
| `/vesztesegfuggveny/` | A veszteségfüggvény — 8 szint |
| `/hibamodok/` | Miért romlik el egy LLM-rendszer? — 10 szint |
| `/python-alapok/` | Python-alapok — 12 gyakorlólap + zárófeladat |
| `/rag-labor/` | RAG-labor — 10 lépés, letölthető kód (`labor/`, `labor.zip`) |
| `/ai-atlasz/` | AI Atlasz — 18 fejezet, interaktív eszközök |
| `/transformer-3d/` | 3D Transformer — film és ábrák |
| `/mi-valtozott/` | havi összefoglaló (útmutató: `mi-valtozott/OLVASSEL.md`) |
| `/stilus/` | belső komponenskészlet (noindex) |

Közös keret: `assets/ait.css`, `assets/ait.js` (arculat, téma, komponensek),
`assets/tananyag.css`, `assets/tananyag.js` (szintek, haladásmentés, kvíz,
kódblokk, grafikon, GoatCounter-esemény). A haladás anyagonként a böngésző
helyi tárolójában marad.

A nyitóoldal külön stílust és szkriptet kap (`assets/nyito/`), a three.js helyi
másolatával (`assets/vendor/three-0.169.0/`, MIT). Szabályai: `CLAUDE.md`.

Build és külső függőség nincs: minden oldal statikus HTML.

© 2026 Csaplár Dániel · [CC BY-NC-SA 4.0](LICENSE)
