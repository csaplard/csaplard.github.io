"""l4_valasz.py — a megtalált darabokból válasz, forrásjelöléssel.

Futtatás:  python3 l4_valasz.py "milyen vizsgával zárul a K-402"

Itt áll össze a kontextus. A sorrend nem esetleges: elöl az állandó keret
(jól cache-elhető), hátul a konkrét kérdés és a kimeneti szerződés — mert
a modell a kontextus végét kezeli a legmegbízhatóbban.
"""

import sys

import kozos
from l3_kereses import BM25, index_betolt, rangfuzio, vektor_kereses, bm25_kereses

RENDSZER_UZENET = """Ügyfélszolgálati dokumentumasszisztens vagy egy online tanfolyamokat
szervező oktatási platformon. Feladatod, hogy a megadott dokumentumrészletek
alapján pontos, ellenőrizhető választ adj az ügyfélszolgálati munkatársaknak.

SZABÁLYOK:
- Kizárólag a megadott részletekből dolgozz. Általános tudásból NE egészítsd ki.
- Minden állítás után add meg a forrás sorszámát így: [2].
- Ha a részletek nem tartalmazzák a választ, pontosan ezt írd:
  "A megadott dokumentumokban nincs erre adat." Ne találgass.
- Ha a részletek ellentmondanak egymásnak, jelezd, és mutasd meg mindkettőt
  a forrásukkal együtt.
- Ha a kérdés személyes adatot érint, hívd fel a figyelmet az adatvédelmi szabályokra.
- Legyen tömör: legfeljebb 8 mondat."""


def kontextus_epit(talalatok, sorok):
    """A találatokból számozott, forrásjelölt szövegblokkot készít.

    A számozás azért kell, hogy a modell hivatkozni tudjon rá — és hogy TE
    utólag ellenőrizni tudd, tényleg abból a darabból származik-e az állítás.
    Ez a különbség egy hiteles és egy hihető rendszer között.
    """
    darabok = []
    for szam, (index, _pontszam) in enumerate(talalatok, start=1):
        sor = sorok[index]
        darabok.append(
            f"[{szam}] Forrás: {sor['forras_fajl']} "
            f"(verzió {sor['verzio']}), fejezet: {sor['fejezet']}\n"
            f"{sor['szoveg']}"
        )
    return "\n\n".join(darabok)


def kerdez(kerdes, matrix, sorok, bm25, k=4):
    # 1. keresés: mindkét ágon bőven, aztán fúzió, végül csak k darab megy be
    talalatok = rangfuzio(
        [vektor_kereses(kerdes, matrix, sorok, k=10),
         bm25_kereses(kerdes, bm25, k=10)],
        k=k,
    )
    kontextus = kontextus_epit(talalatok, sorok)

    # 2. a prompt összeállítása — a kérdés HÁTUL van, a részletek után
    prompt = f"""DOKUMENTUMRÉSZLETEK:

{kontextus}

--- 

KÉRDÉS: {kerdes}

Válaszolj a fenti szabályok szerint, forrásjelöléssel."""

    valasz = kozos.valaszol(prompt, rendszer_uzenet=RENDSZER_UZENET)
    return valasz, talalatok, prompt


def main():
    kerdes = " ".join(sys.argv[1:]) or "milyen vizsgával zárul a K-402"
    matrix, sorok = index_betolt()
    bm25 = BM25([s["szoveg"] for s in sorok])

    valasz, talalatok, prompt = kerdez(kerdes, matrix, sorok, bm25)

    print("=" * 78)
    print("KÉRDÉS:", kerdes)
    print("=" * 78)
    print("\nÁTADOTT FORRÁSOK:")
    for szam, (index, _) in enumerate(talalatok, start=1):
        s = sorok[index]
        print(f"  [{szam}] {s['forras_fajl']} — {s['fejezet']}")

    print(f"\nPROMPT MÉRETE: {len(prompt)} karakter "
          f"(nagyjából {len(prompt) // 4} token)")
    print("\nVÁLASZ:")
    print("-" * 78)
    print(valasz)


if __name__ == "__main__":
    main()
