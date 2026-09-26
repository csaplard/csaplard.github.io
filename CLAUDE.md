# AI-tananyagok — nyitóoldal

Ingyenes, magyar nyelvű AI-tananyagok nyitóoldala (csaplard.github.io). A bevezető hátterében egy forgatható 3D transzformer-modell áll. Minden szöveg magyar, a tegező, hétköznapi hangnemet tartsd meg.

## Build nincs

A repó statikus HTML; a GitHub Pages közvetlenül ezt szolgálja ki. Helyi kipróbálás: `python -m http.server` a repó gyökerében (az útvonalak `/`-rel kezdődnek, fájlként megnyitva nem működik).

## Szerkezet

- `index.html` — a nyitóoldal teljes tartalma: fejléc, bevezető, útvonal (`#route`), „Minden anyag” (`.grid7`), „Mi változott?”, lábléc.
- `assets/nyito/main.js` — téma-váltó, élő cím (tokenek + figyelem-ívek), a 3D modell indítása, mozgásérzékelés-kapcsoló, útvonal-ív és nézetváltás, nagyítógombok.
- `assets/nyito/scene.js` — a 3D modell (three.js): geometria, anyagok, régiók, nézetek (`VIEWS`), címkék, vezérlés, döntés mobilon.
- `assets/nyito/nyito.css` — színtokenek és a nyitóoldal minden stílusa.
- `assets/vendor/three-0.169.0/` — a three.js helyi másolata (MIT); az `index.html` importmapje ide mutat.
- `assets/ait.css`, `assets/tananyag.*` — a tananyagoldalak közös kerete (a nyitóoldal nem használja).
- A tervezési források (arculat, tokenek, tokenizáló, jelgenerátor) a Claude Design-projektben vannak: `C:\dev\oktatóanyagorrasoki-tananyagok-claude-codei-tananyagok\`.

## Új anyag felvétele

1. `index.html` → `#route`: új `<li data-view="..." data-say="...">` (szám, cím, egysoros leírás). Ha még nem érhető el: `class="soon"`, link helyett `div.soon-box`, és a leírás végén „hamarosan”.
2. `assets/nyito/scene.js` → `VIEWS`: új nézet `{ pos, tgt, lit: [régiók] }`. Régiók: `tokens`, `embed`, `stream`, `attn`, `mlp`, `out`, `top`, `docs`; `"all"` = minden. `warn: true` borostyán kiemelés, `wire: true` csak élek.
3. `index.html` → `.grid7`: új elem jellel (SVG), számmal, címmel, egy mondattal és tényekkel. Új jelet a design-projekt `tools/glyphs.py` stílusában rajzolj (izometrikus, üveg + arany, tokenszínekkel).
4. Ha változik a darabszám, igazítsd a rácsot (`.grid7` oszlopai).

## Élő cím (ezt meg kell tartani)

- A főcím valódi tokenekből áll (`TOK` a `assets/nyito/main.js`-ben, `[szórészlet, azonosító]` párok). Új címszöveghez futtasd a design-projektben: `npm run tokenize -- "szöveg"`, és az eredményt másold be. Azonosítót soha ne találj ki.
- Rámutatáskor a szórészlet ívet húz minden korábbi részletre, a vastagság a (szemléltető) súly, és előre sosem néz. Ez a funkció az oldal névjegye.

## Vezérlés (így kell működnie)

- **Egér:** húzással forgat. A sima görgő mindig az oldalt görgeti. Nagyítás: Ctrl/⌘ + görgő, vagy a jobb alsó +/−/↺ gombok. Dupla kattintás: alapnézet.
- **Érintés:** egy ujj forgat, két ujj csippentve nagyít, dupla koppintás: alapnézet. Érintőképernyőn nincsenek gombok. A modell mobilon csak a képernyő kb. 60%-át foglalja, hogy mellette görgetni lehessen.
- **Billentyű:** a kijelölt modellen a bal/jobb nyíl forgat, a +/− nagyít.
- **Eltolás (pan) nincs,** hogy a modell ne csússzon a szöveg alá. A nagyításnak alsó határa van (`minDistance`) ugyanezért.
- **Anyagváltás:** a listában egy anyagra mutatva a kamera ugyanabból a távolságból arra a részre fordul, és kiemeli. Egérrel a listáról lemenve visszaáll.

## Mozgás

- Nincs folyamatos háttéranimáció. A jelek betöltéskor egyszer felfutnak, utána a jelenet csak interakcióra rajzol újra (`kick()`).
- `prefers-reduced-motion` esetén a felfutás és a kameraút elmarad, a nézet azonnal vált.

## Döntés mobilon (giroszkóp)

- A telefon döntése legfeljebb ±12°-kal fordítja el a kamerát az aktuális nézethez képest, simítva (`scene.js` → „döntés mobilon”). A vezérlő állapotát nem módosítja, csak a rajzolás idejére hat.
- Érintéses forgatás közben szünetel; utána az új tartás a nyugalmi helyzet, és a hatás lassan tér vissza.
- Androidon magától indul. iOS-en a „Mozgásérzékelés be” kapcsoló kér engedélyt (`DeviceOrientationEvent.requestPermission`).
- Csak érdemi (0,1°-nál nagyobb) változásra rajzol újra, és csak amíg a modell látható és a lap nincs háttérben.
- `prefers-reduced-motion` esetén ki van kapcsolva, a kapcsoló sem jelenik meg.

## Arculati szabályok (kötelező)

- **Színek csak tokenekből** (`assets/nyito/nyito.css`, forrás: a design-projekt `design/tokens.json` fájlja).
  - Arany (`--gold`) = fő adatút, kiemelés, haladás.
  - `--q` / `--k` / `--v` = Query / Key / Value jelek, kizárólag jelként.
- **Betűk:** Literata (címek, folyószöveg) és Geologica (felület, címkék, számok).
  - Minden új betűtípusnál vizuálisan ellenőrizd, hogy az ő, ű, Ő, Ű tisztán kétvesszős. Egyes keskenyíthető betűknél keskeny állásban összeolvad, és ó-nak látszik.
- **Kontraszt:** a folyószöveg legalább 7:1, a mellékszöveg legalább 4,5:1, mindkét módban. A világos mód külön megtervezett, nem invertálás.
- **Kerüld:**
  - címke a főcímek fölött, apró szakaszszámok díszként;
  - díszítő rács, kitalált koordináták;
  - egyforma kártyák rácsa, keretes dobozok, oldalsó színcsík;
  - csupa nagybetűs monospace feliratok;
  - lila–kék színátmenet, neon, üveghatás a felületen;
  - robot, agy, áramköri kép; gépészeti, gyári, ipari példák.
- **Őszinteség:**
  - Nincs kitalált statisztika („50+ példa”), kitalált idézet vagy ár-duma. Csak olyan anyag és szám kerülhet ki, ami valóban létezik.
  - Ami szemléltető (figyelemsúly, valószínűség), azt az oldal mondja is ki.
- **Márka- és cégnév nem szerepelhet** a tartalomban (az oldal neve: „AI-tananyagok”).

## Ellenőrzés minden változtatás után

- 390 px és 1440 px szélességen, sötét és világos módban: nincs vízszintes görgetés (`scrollWidth === clientWidth`), nincs konzolhiba.
- A cím ívei működnek, a modell forog (egér és érintés), a görgő az oldalt görgeti.
- Kontraszt: új színpárnál számold ki (WCAG).
