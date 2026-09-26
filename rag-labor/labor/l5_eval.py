"""l5_eval.py — a labor legfontosabb scriptje: MÉRÉS.

Futtatás:  python3 l5_eval.py

Eddig a rendszert építettük. Innentől azt kérdezzük: JÓ-E? És ami még
fontosabb: ha holnap átírsz valamit, JOBB LETT-E?

Amit mérünk, az a recall@k: a kérdések hány százalékánál van benne az
első k találatban az a darab, ami valóban tartalmazza a választ.
Ez a rendszer FELSŐ KORLÁTJA — ha a helyes darab nincs bent, a világ
legjobb modellje sem fog jó választ adni belőle.
"""

import json
from pathlib import Path

from l3_kereses import (BM25, bm25_kereses, index_betolt, rangfuzio,
                        vektor_kereses)
import kozos

MAPPA = Path(__file__).parent
KERDESEK = MAPPA / "kerdesek.json"


def talalat_e(talalatok, sorok, kell_forras, kell_fejezet):
    """Igaz, ha a várt darab benne van a találatokban.

    A fejezetnél 'benne van' egyezést nézünk (in operátor), nem pontosat,
    hogy a golden setben elég legyen a fejezetcím eleje.
    """
    for index, _pontszam in talalatok:
        sor = sorok[index]
        if sor["forras_fajl"] == kell_forras and kell_fejezet in sor["fejezet"]:
            return True
    return False


def merj(nev, kereso, kerdesek, sorok, k):
    """Egy keresési módszert végigfuttat a teljes golden seten.

    A 'kereso' egy FÜGGVÉNY, amit paraméterként adunk át. Pythonban a
    függvény is érték: átadható, listába tehető. Ezért tudjuk ugyanazt a
    mérőkódot háromféle keresőre használni.
    """
    talalt = 0
    merheto = 0
    hibas_kerdesek = []

    for tetel in kerdesek:
        if tetel["kell_forras"] is None:
            continue  # a "nincs adat" eseteket itt nem mérjük
        merheto += 1
        talalatok = kereso(tetel["kerdes"], k)
        if talalat_e(talalatok, sorok, tetel["kell_forras"],
                     tetel["kell_fejezet"]):
            talalt += 1
        else:
            hibas_kerdesek.append(tetel)

    arany = 100 * talalt / merheto
    print(f"  {nev:22s} recall@{k}: {talalt:2d}/{merheto}  ({arany:5.1f}%)")
    return arany, hibas_kerdesek


def main():
    kerdesek = json.loads(KERDESEK.read_text(encoding="utf-8"))
    matrix, sorok = index_betolt()
    bm25 = BM25([s["szoveg"] for s in sorok])

    print("=" * 74)
    print(f"KIÉRTÉKELÉS — BACKEND = {kozos.BACKEND}")
    print(f"{len(kerdesek)} kérdés, ebből {sum(1 for t in kerdesek if t['kell_forras'])} mérhető")
    print("=" * 74)

    # a három keresőt azonos alakú függvénnyé csomagoljuk
    keresok = {
        "csak vektor": lambda q, k: vektor_kereses(q, matrix, sorok, k=k),
        "csak BM25": lambda q, k: bm25_kereses(q, bm25, k=k),
        "hibrid (fúzió)": lambda q, k: rangfuzio(
            [vektor_kereses(q, matrix, sorok, k=10), bm25_kereses(q, bm25, k=10)],
            k=k),
    }

    for k in (1, 3, 5):
        print(f"\nk = {k}:")
        eredmenyek = {}
        for nev, kereso in keresok.items():
            arany, hibas = merj(nev, kereso, kerdesek, sorok, k)
            eredmenyek[nev] = (arany, hibas)

    # a hibás esetek a legértékesebb kimenet: EZEKEN kell dolgozni
    print("\n" + "=" * 74)
    print("AMIT A HIBRID KERESÉS k=5-NÉL SEM TALÁL MEG:")
    print("=" * 74)
    _arany, hibasak = merj("hibrid (fúzió)", keresok["hibrid (fúzió)"],
                           kerdesek, sorok, 5)
    if not hibasak:
        print("  Nincs ilyen — de ez ennyi kérdésnél nem diadal, hanem")
        print("  arra jelzés, hogy nehezebb kérdésekre van szükség.")
    for tetel in hibasak:
        print(f"\n  [{tetel['tipus']}] {tetel['kerdes']}")
        print(f"    kellett volna: {tetel['kell_forras']} / {tetel['kell_fejezet']}")

    print("\n" + "=" * 74)
    print("TIPUSONKÉNTI BONTÁS (hibrid, k=3) — hol gyenge a rendszer?")
    print("=" * 74)
    tipusok = {}
    for tetel in kerdesek:
        if tetel["kell_forras"] is None:
            continue
        talalatok = keresok["hibrid (fúzió)"](tetel["kerdes"], 3)
        siker = talalat_e(talalatok, sorok, tetel["kell_forras"],
                          tetel["kell_fejezet"])
        tipus = tetel["tipus"]
        if tipus not in tipusok:
            tipusok[tipus] = [0, 0]
        tipusok[tipus][1] += 1
        if siker:
            tipusok[tipus][0] += 1

    for tipus, (jo, osszes) in sorted(tipusok.items()):
        print(f"  {tipus:14s} {jo}/{osszes}")

    print("\nEz a bontás mondja meg, MIT javíts. Egy összesített szám nem.")


if __name__ == "__main__":
    main()
