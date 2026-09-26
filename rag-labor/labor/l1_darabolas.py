"""l1_darabolas.py — dokumentumok darabolása indexelhető egységekre.

Futtatás:  python3 l1_darabolas.py

Ez a lépés dönti el a rendszer minőségének nagy részét. Nem karakterszám
szerint vágunk, hanem SZERKEZET szerint: minden '## ' fejezet egy darab.
És minden darab elejére odaírjuk, honnan jött — enélkül a
"Megengedett hiányzás: legfeljebb 3 alkalom" mondat értelmezhetetlen.
"""

import json
import re
from pathlib import Path

MAPPA = Path(__file__).parent / "dokumentumok"
KIMENET = Path(__file__).parent / "darabok.json"


def fejlec_beolvas(szoveg):
    """A fájl elején lévő 'kulcs: ertek' sorokból szótárat csinál.

    A szótár (dict) kulcs-érték párok tárolója. Így néz ki:
        {"kurzus": "K-402", "verzio": "3.1"}
    Az értékét a szogletes zárójellel kérdezzük le: fejlec["kurzus"].
    """
    metaadat = {}
    for sor in szoveg.split("\n"):
        # a 'kurzus: K-402' alakú sorokat keressük, de csak a fejezetek előtt
        if sor.startswith("#"):
            continue
        if ":" in sor and not sor.startswith(" "):
            kulcs, _, ertek = sor.partition(":")
            kulcs = kulcs.strip()
            # csak a várt kulcsokat fogadjuk el, hogy a szövegtörzsből
            # ne szedjünk fel véletlenül "Bejelentés: ..." sorokat
            if kulcs in ("dokumentumtipus", "kurzus", "terulet", "verzio",
                         "ervenyes_tol"):
                metaadat[kulcs] = ertek.strip()
    return metaadat


def darabol(fajl):
    """Egy fájlból darabok listáját készíti.

    A lista (list) sorrendezett gyűjtemény; a végére az .append() tesz elemet.
    Minden elem itt egy dict lesz, egy darab adataival.
    """
    szoveg = fajl.read_text(encoding="utf-8")
    metaadat = fejlec_beolvas(szoveg)

    # a dokumentum címe az első '# ' sor
    cim_talalat = re.search(r"^# (.+)$", szoveg, re.MULTILINE)
    cim = cim_talalat.group(1) if cim_talalat else fajl.stem

    darabok = []
    # a '## ' fejezetcímek mentén vágunk. A zárójeles csoport miatt a
    # split() a szétvágott részek KÖZÉ beteszi magukat a címeket is.
    reszek = re.split(r"^## (.+)$", szoveg, flags=re.MULTILINE)
    # reszek[0] a fejléc a fejezetek előtt; utána párosával: cím, tartalom
    for i in range(1, len(reszek), 2):
        fejezet_cim = reszek[i].strip()
        tartalom = reszek[i + 1].strip()
        if not tartalom:
            continue

        # EZ A KULCSLÉPÉS: a darab magával viszi a kontextusát.
        # A puszta tartalom önmagában sokszor félreérthető.
        beagyazando = f"{cim} — {fejezet_cim}\n\n{tartalom}"

        darabok.append({
            "azonosito": f"{fajl.stem}#{i // 2 + 1}",
            "forras_fajl": fajl.name,
            "dokumentum_cim": cim,
            "fejezet": fejezet_cim,
            "szoveg": beagyazando,
            "metaadat": metaadat,
        })
    return darabok


def main():
    osszes = []
    # sorted(): determinisztikus sorrend, hogy két futás ugyanazt adja
    for fajl in sorted(MAPPA.glob("*.md")):
        darabok = darabol(fajl)
        osszes.extend(darabok)  # extend: a lista ELEMEIT fűzi hozzá
        print(f"{fajl.name:45s} -> {len(darabok):2d} darab")

    KIMENET.write_text(
        json.dumps(osszes, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nÖsszesen {len(osszes)} darab -> {KIMENET.name}")

    print("\nPélda egy darabra:")
    print("-" * 60)
    p = osszes[0]
    print("azonosito :", p["azonosito"])
    print("metaadat  :", p["metaadat"])
    print("szoveg    :", p["szoveg"][:220].replace("\n", " ") + " ...")

    hosszak = [len(d["szoveg"]) for d in osszes]
    print("-" * 60)
    print(f"darabhossz: legrovidebb {min(hosszak)}, "
          f"atlag {sum(hosszak) // len(hosszak)}, leghosszabb {max(hosszak)} karakter")


if __name__ == "__main__":
    main()
