# „Mi változott?” — így kerül fel egy új havi bejegyzés

A bejegyzések egyetlen fájlban vannak: `bejegyzesek.json`. Az oldal
(`index.html`) és a nyitóoldal „Mi változott?” sávja is ebből olvas.

## Új hónap hozzáadása

1. Másold le a `bejegyzesek.json` első elemét (a `{ ... }` blokkot), és tedd
   a lista elejére.
2. Töltsd ki:
   - `honap`: `"ÉÉÉÉ-HH"`, például `"2026-10"`
   - `cim`: egy mondat, ami összefoglalja a hónap legfontosabb változását
   - `bevezeto`: 2–3 mondat
   - `tetelek`: 3–5 tétel, mindegyikben
     - `cim`: rövid cím
     - `mi_tortent`: tényszerűen, dátummal
     - `mit_jelent`: egyszerűen, egy hétköznapi példával
     - `kapcsolodo` (nem kötelező): link egy tananyagrészre, pl. `"/hibamodok/#szint-6"`
     - `forrasok`: legalább egy `{ "nev": "...", "url": "..." }`
3. Amíg dolgozol rajta, maradjon `"piszkozat": true`. Előnézet:
   `https://ailessons.hu/mi-valtozott/?minta=1`
4. Ha kész, töröld a `"piszkozat": true` sort (vagy írd `false`-ra), és
   pushold. A nyitóoldal automatikusan a legfrissebb közzétett hónap címét
   mutatja.

## Szabályok

- Minden tételhez ellenőrzött forrás kell. Ha valamit nem sikerült
  ellenőrizni, ne kerüljön fel.
- A példákban ne legyen cég- vagy munkahelynév; a forrás neve a
  forrásjelölésben természetesen szerepelhet.
- A kitöltetlen minta (`[...]` szövegek) piszkozatként marad a fájlban, a
  nyilvános oldalon nem jelenik meg.
