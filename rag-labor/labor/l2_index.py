"""l2_index.py — a darabokból kereshető index.

Futtatás:  python3 l2_index.py

Nem használunk vektoradatbázist. Két közönséges dolgot használunk:
  - SQLite: egy fájlba írt, szerverltelen adatbázis, benne van a Pythonban.
    Ide megy a darabok SZÖVEGE és METAADATA.
  - numpy .npy fájl: ide megy a vektorok mátrixa.

Ez néhány ezer darabig tökéletesen elég, és cserébe minden lépés látható.
Egy igazi vektoradatbázis ugyanezt csinálja, csak közelítő kereséssel és
sok üzemeltetési kényelemmel.
"""

import json
import sqlite3
import time
from pathlib import Path

import numpy as np

import kozos

MAPPA = Path(__file__).parent
DARABOK = MAPPA / "darabok.json"
ADATBAZIS = MAPPA / "index.sqlite"
VEKTOROK = MAPPA / "vektorok.npy"


def tabla_letrehoz(kapcsolat):
    """Létrehozza a táblát, ha még nincs.

    A 'sor' oszlop a LÉNYEG: ez köti össze az adatbázis sorát a
    vektormátrix megfelelő sorával. A vektor a mátrixban van, a szöveg
    az adatbázisban, és ez a szám a kettő közti híd.
    """
    kapcsolat.execute("DROP TABLE IF EXISTS darabok")
    kapcsolat.execute("""
        CREATE TABLE darabok (
            sor            INTEGER PRIMARY KEY,
            azonosito      TEXT,
            forras_fajl    TEXT,
            fejezet        TEXT,
            szoveg         TEXT,
            kurzus         TEXT,
            dokumentumtipus TEXT,
            verzio         TEXT
        )
    """)
    # index a szűrőmezőkre: enélkül nagy táblán lassú lenne a WHERE
    kapcsolat.execute("CREATE INDEX idx_kurzus ON darabok(kurzus)")


def main():
    darabok = json.loads(DARABOK.read_text(encoding="utf-8"))
    print(f"{len(darabok)} darab betöltve. BACKEND = {kozos.BACKEND}")

    kapcsolat = sqlite3.connect(ADATBAZIS)
    tabla_letrehoz(kapcsolat)

    vektor_lista = []
    kezdet = time.time()

    # enumerate(): egyszerre adja a sorszámot és az elemet
    for sor, darab in enumerate(darabok):
        vektor = kozos.embedding(darab["szoveg"])
        vektor_lista.append(vektor)

        meta = darab["metaadat"]
        # A '?' helyőrző NEM kényelmi kérdés: így az adat sosem keveredik
        # a lekérdezés szövegével. Ez véd az SQL-injektálás ellen.
        kapcsolat.execute(
            "INSERT INTO darabok VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                sor,
                darab["azonosito"],
                darab["forras_fajl"],
                darab["fejezet"],
                darab["szoveg"],
                meta.get("kurzus", ""),       # .get(): ha nincs ilyen kulcs,
                meta.get("dokumentumtipus", ""),  # nem hibázik, hanem ""-t ad
                meta.get("verzio", ""),
            ),
        )

    kapcsolat.commit()  # e nélkül az írás nem véglegesül
    kapcsolat.close()

    # np.vstack: a vektorok listájából egyetlen mátrix (26 x 256)
    matrix = np.vstack(vektor_lista)
    np.save(VEKTOROK, matrix)

    eltelt = time.time() - kezdet
    print(f"Vektormátrix alakja: {matrix.shape}  "
          f"({matrix.shape[0]} darab x {matrix.shape[1]} dimenzió)")
    print(f"Memóriaigény: {matrix.nbytes / 1024:.1f} kB")
    print(f"Idő: {eltelt:.2f} mp  ({len(darabok) / max(eltelt, 1e-9):.0f} darab/mp)")
    print(f"\nKiírva: {ADATBAZIS.name}, {VEKTOROK.name}")
    print("\nSzámold ki: 1 millió darabnál ez a mátrix "
          f"{1_000_000 * matrix.shape[1] * 4 / 1e9:.1f} GB lenne float32-ben. "
          "Ezért kell egy ponton kvantálás és közelítő keresés.")


if __name__ == "__main__":
    main()
