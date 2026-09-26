"""Létrehozza a szintetikus ügyfélszolgálati korpuszt a dokumentumok/ mappában.
Egyszer kell lefuttatni: python3 keszits_korpuszt.py

A dokumentumok egy kitalált, online tanfolyamokat szervező oktatási
platform belső anyagai. Minden név, kód és szám kitalált.
"""
from pathlib import Path

DOKUMENTUMOK = {
"K-402_kurzusleiras.md": """# K-402 Python-alapok tanfolyam — kurzusleírás
dokumentumtipus: kurzusleiras
kurzus: K-402
terulet: programozas
verzio: 3.1
ervenyes_tol: 2025-04-01

## 1. Általános adatok
A K-402 nyolchetes, kezdőknek szóló online Python-tanfolyam.
Heti alkalmak száma: 2, alkalmanként 90 perc. Maximális létszám: 24 fő.
Részvételi díj: 89 000 Ft.
Modulkód (bevezető modul): MOD-402-118. Modulkód (projektmodul): MOD-402-055.

## 2. Vizsga
A tanfolyam kétrészes vizsgával zárul: írásbeli teszt és beadandó projekt.
A beadandó projektet a vizsga előtt legalább 48 órával fel kell tölteni.
Vizsgakód: VK-402-2K. Jelentkezni kizárólag azonos kódú vizsgaidőpontra lehet.

## 3. Előkészület és eszközök
A tanfolyamhoz szükséges: saját laptop legalább 8 GB memóriával,
Python 3.10 vagy újabb, egy kódszerkesztő és stabil internetkapcsolat.
Az első alkalom előtt ki kell tölteni a szintfelmérő tesztet (SZF-2).
A szintfelmérőn legalább 45 pontot kell elérni a 100-ból.

## 4. Konzultáció
Egyéni konzultáció: kéthetente 15 perc, előzetes foglalással.
Csoportos kérdezz-felelek: minden pénteken 30 perc.

## 5. Teljesítési feltételek
Megengedett hiányzás: legfeljebb 3 alkalom.
A beadandó feladatok legalább 80 százalékát teljesíteni kell.
A tanúsítványhoz legalább 60 százalékos vizsgaeredmény szükséges.
Ennél több hiányzás esetén a tanfolyam nem teljesíthető, pótlás a következő évfolyamon.
""",

"K-405_kurzusleiras.md": """# K-405 Adatelemzés Pythonnal tanfolyam — kurzusleírás
dokumentumtipus: kurzusleiras
kurzus: K-405
terulet: programozas
verzio: 2.4
ervenyes_tol: 2024-11-15

## 1. Általános adatok
A K-405 tizenkét hetes, haladó online tanfolyam, a K-402 folytatása.
Heti alkalmak száma: 1, alkalmanként 120 perc. Maximális létszám: 18 fő.
Részvételi díj: 129 000 Ft.
Modulkód (projektmodul): MOD-405-090.

## 2. Vizsga
A K-405 egyrészes vizsgával zárul: egy beadandó adatelemzéssel.
Vizsgakód: VK-405-1E.
FIGYELEM: a K-402 vizsgakódja (VK-402-2K) NEM használható ennél a kurzusnál,
mert a vizsga felépítése és a követelmények eltérnek.

## 3. Képzési ütem
Záró projektbemutató: a 12. héten.
Részbeszámoló: 6 hetente.
Rövid kvíz: kéthetente.
A K-402 üteme ettől eltér, mert az rövidebb, intenzív tanfolyam.

## 4. Teljesítési feltételek
Megengedett hiányzás: legfeljebb 2 alkalom.
A tanúsítványhoz legalább 70 százalékos eredmény szükséges.
""",

"ugyfelszolgalati_utmutato.md": """# Ügyfélszolgálati útmutató — általános előírások
dokumentumtipus: utmutato
kurzus: altalanos
terulet: ugyfelszolgalat
verzio: 5.0
ervenyes_tol: 2026-01-01

## 1. Hatály
Ez az útmutató a platform összes tanfolyamára vonatkozik, ha a
kurzusleírás szigorúbbat nem ír elő.
Ellentmondás esetén mindig a kurzusleírás az erősebb.

## 2. Elégedettségmérés
Az elégedettségi kérdőívet modulonként kell kiküldeni, kiemelt kurzusokon hetente.
A trend fontosabb, mint az abszolút érték: 30 százalékos csökkenés két
egymást követő mérés között akkor is beavatkozást indokol, ha az érték
még az elfogadható szint felett van.

## 3. Jellemző hibajelenségek
Bejelentkezési hiba: a hallgató nem jut be a fiókjába, vagy a jelszó-visszaállító
levél nem érkezik meg. Ilyenkor elsőként mindig a levélszemét mappát kell ellenőriztetni.
Lejátszási hiba: a videó akadozik, elsötétül, vagy a hang elcsúszik a képtől;
jellemzően lassú internetkapcsolat vagy elavult böngésző okozza.
Feltöltési hiba: a beadandó feltöltése megszakad; a fájl mérete ilyenkor
jellemzően meghaladja a 25 MB-os korlátot.
Fizetési hiba: a befizetés nem jelenik meg a fiókban; a banki átfutás
akár két munkanapig is tarthat.

## 4. Eszkalációs sürgősség
Azonnali továbbítás: adatvédelmi incidens, kétszeres terhelés a bankkártyán,
vagy ha a vizsga időpontjában nem érhető el a vizsgafelület.
24 órán belül: a hallgató nem tud belépni a tanfolyam kezdete előtt.
Tervezhető: tartalmi javaslat, elírás a tananyagban.
""",

"adatvedelmi_szabalyzat.md": """# Adatvédelmi szabályzat — hallgatói adatok kezelése
dokumentumtipus: adatvedelem
kurzus: altalanos
terulet: altalanos
verzio: 4.2
ervenyes_tol: 2025-09-01

## 1. Azonosítás adatkérés előtt
Bármely hallgatói adat kiadása vagy módosítása előtt a kérelmezőt két
független adattal kell azonosítani: a regisztrált e-mail-címmel és a
születési dátummal. Jelszót soha, semmilyen csatornán nem kérünk el.

## 2. Törlési kérelem
Törlési kérelem esetén a hallgató minden személyes adatát 30 napon belül
törölni kell. A K-402 esetében a vizsgaeredményeket a tanúsítvány kiadása
után is törölni kell, mert azokat külön nyilvántartás nem őrzi.

## 3. Hozzáférési jogosultságok
Vizsgaeredményhez csak az oktató és a tanulmányi ügyintéző férhet hozzá.
Fizetési adatokhoz csak a pénzügyi csoport férhet hozzá.

## 4. Adattárolás
A hallgatói adatok kizárólag a platform saját rendszerében tárolhatók.
Magáncélú eszközre vagy külső szolgáltatásba adatot másolni tilos.
""",

"ugyfeljegy_kivonat_2025.md": """# Ügyféljegy-kivonat — programozási tanfolyamok, 2025
dokumentumtipus: ugyfeljegy_kivonat
kurzus: tobb
terulet: programozas
verzio: 1.0
ervenyes_tol: 2026-01-10

## UJ-2025-0142 (K-402)
Bejelentés: a hallgató nem tud belépni, a jelszó-visszaállító levél nem jön meg.
Megállapítás: a levél a levélszemét mappába került.
Megoldás: új levél küldése, tájékoztatás a szűrőbeállításról. Megoldási idő: 6 óra.

## UJ-2025-0211 (K-402)
Bejelentés: a beadandó projekt feltöltése többször megszakadt.
Megállapítás: a fájl mérete 180 MB volt, a korlát 25 MB.
Megoldás: tömörítési útmutató, határidő-hosszabbítás. Megoldási idő: 9 óra.

## UJ-2025-0388 (K-405)
Bejelentés: az első alkalom videója akadozik.
Megállapítás: elavult böngészőverzió.
Megoldás: frissítési útmutató. Megoldási idő: 2 óra.

## UJ-2025-0455 (K-402)
Bejelentés: a befizetés nem jelenik meg a fiókban.
Megállapítás: banki átfutás, a befizetés másnap megérkezett.
Megoldás: tájékoztatás, kézi jóváírás. Megoldási idő: 4 óra.

## UJ-2025-0501 (K-405)
Bejelentés: a vizsgakód nem fogadható el a jelentkezésnél.
Megállapítás: a hallgató a VK-402-2K kódot adta meg a VK-405-1E helyett.
Megoldás: helyes kód megadása, jelentkezés rögzítése. Megoldási idő: 5 óra.
""",

"visszateritesi_szabalyzat.md": """# Visszatérítési szabályzat — tanfolyami díjak
dokumentumtipus: szabalyzat
kurzus: altalanos
terulet: altalanos
verzio: 2.0
ervenyes_tol: 2026-03-01

## 1. Visszatérítési jogosultság
A tanfolyam kezdete előtt a díj teljes összege visszajár.
A kezdés után két héten belül a díj fele jár vissza, azután nem jár vissza.

## 2. Értékhatárok
100 000 Ft alatt: ügyfélszolgálati munkatárs jóváhagyása elegendő.
100 000 - 1 000 000 Ft között: csoportvezetői jóváhagyás szükséges.
1 000 000 Ft fölött: pénzügyi bizottsági eljárás.

## 3. Sürgősségi visszatérítés
Kétszeres terhelés esetén sürgősségi eljárás indítható,
amelyhez a csoportvezető szóbeli engedélye is elegendő, de 24 órán belül
írásban pótolni kell.

## 4. A kérelem azonosítása
Minden visszatérítési kérelmen fel kell tüntetni a számla sorszámát.
Számlaszám nélküli kérelmet a pénzügy visszautasít.
""",
}

if __name__ == "__main__":
    mappa = Path(__file__).parent / "dokumentumok"
    mappa.mkdir(exist_ok=True)
    for nev, tartalom in DOKUMENTUMOK.items():
        (mappa / nev).write_text(tartalom, encoding="utf-8")
        print("kiírva:", nev, f"({len(tartalom)} karakter)")
    print(f"\nKész: {len(DOKUMENTUMOK)} dokumentum a {mappa} mappában.")
