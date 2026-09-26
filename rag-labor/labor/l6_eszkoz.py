"""l6_eszkoz.py — amit a RAG nem tud: számolás. Eszközhívás.

Futtatás:  python3 l6_eszkoz.py

Kérdés: "Mennyi volt a K-402 ügyféljegyeinek összes megoldási ideje 2025-ben?"
Ezt keresésből NEM lehet megválaszolni. A válasz nincs leírva sehol —
öt ügyféljegyből kell összeadni. Ez nem keresési, hanem SZÁMÍTÁSI feladat.

A megoldás: adunk a modellnek egy eszközt. A modell nem futtat semmit,
csak KÉR: "hívd meg az ugyfeljegy_statisztika függvényt kurzus='K-402'
paraméterrel". A hívást a te kódod végzi el, az eredményt visszaadod,
és a modell abból fogalmaz.
"""

import json
import re
import sqlite3
from pathlib import Path

import kozos

MAPPA = Path(__file__).parent
UGYFELJEGYEK = MAPPA / "dokumentumok" / "ugyfeljegy_kivonat_2025.md"
ADATBAZIS = MAPPA / "ugyfeljegyek.sqlite"


# ---------------------------------------------------------------------------
# 1. Strukturált adat kinyerése a szabad szövegből
# ---------------------------------------------------------------------------

def ugyfeljegyek_beolvas():
    """A markdown ügyféljegy-kivonatból rendes táblát csinál.

    Ez maga is tipikus AI-alkalmazás lenne nagy tételszámnál (7. fejezet a
    kézikönyvben), de 5 jegynél a reguláris kifejezés olcsóbb és pontosabb.
    Fontos szokás: ne hívj modellt oda, ahol egy regex elég.
    """
    szoveg = UGYFELJEGYEK.read_text(encoding="utf-8")
    jegyek = []
    # minden '## UJ-2025-0142 (K-402)' fejléc egy jegy kezdete
    blokkok = re.split(r"^## ", szoveg, flags=re.MULTILINE)[1:]
    for blokk in blokkok:
        fejlec, _, torzs = blokk.partition("\n")
        m = re.match(r"(UJ-\d{4}-\d+)\s*\((\S+)\)", fejlec.strip())
        if not m:
            continue
        azonosito, kurzus = m.group(1), m.group(2)
        ora = re.search(r"Megoldási idő:\s*(\d+)\s*óra", torzs)
        jegyek.append({
            "azonosito": azonosito,
            "kurzus": kurzus,
            "megoldasi_ido_ora": int(ora.group(1)) if ora else 0,
            "leiras": torzs.strip().replace("\n", " "),
        })
    return jegyek


def adatbazis_epit():
    kapcsolat = sqlite3.connect(ADATBAZIS)
    kapcsolat.execute("DROP TABLE IF EXISTS ugyfeljegyek")
    kapcsolat.execute("""CREATE TABLE ugyfeljegyek (
        azonosito TEXT, kurzus TEXT, megoldasi_ido_ora INTEGER, leiras TEXT)""")
    for j in ugyfeljegyek_beolvas():
        kapcsolat.execute("INSERT INTO ugyfeljegyek VALUES (?, ?, ?, ?)",
                          (j["azonosito"], j["kurzus"], j["megoldasi_ido_ora"],
                           j["leiras"]))
    kapcsolat.commit()
    return kapcsolat


# ---------------------------------------------------------------------------
# 2. Az eszköz: egy közönséges Python-függvény
# ---------------------------------------------------------------------------

def ugyfeljegy_statisztika(kurzus=None):
    """Visszaadja egy kurzus ügyféljegy-statisztikáját 2025-re.

    Figyeld meg, mit ad vissza: TÖMÖR, aggregált adatot. Nem az öt teljes
    ügyféljegy szövegét — az bemenne a kontextusba, tokent és figyelmet enne.
    Az eszköz feladata a szűrés, nem a nyers adat átpasszolása.
    """
    kapcsolat = sqlite3.connect(ADATBAZIS)
    if kurzus:
        sorok = kapcsolat.execute(
            "SELECT azonosito, megoldasi_ido_ora FROM ugyfeljegyek WHERE kurzus = ?",
            (kurzus,)).fetchall()
    else:
        sorok = kapcsolat.execute(
            "SELECT azonosito, megoldasi_ido_ora FROM ugyfeljegyek").fetchall()
    kapcsolat.close()

    if not sorok:
        # TANÍTÓ hibaüzenet: megmondja, mi a helyes érték. A modell ebből
        # ki tudja javítani magát. A "Hiba: nincs adat" nem tanít semmit.
        return {"hiba": f"Nincs '{kurzus}' kódú kurzus. Ismert kurzusok: K-402, K-405."}

    orak = [s[1] for s in sorok]
    return {
        "kurzus": kurzus or "összes",
        "ugyfeljegyek_szama": len(sorok),
        "osszes_megoldasi_ido_ora": sum(orak),
        "leghosszabb_megoldasi_ido_ora": max(orak),
        "jegyazonositok": [s[0] for s in sorok],
    }


# az eszköz LEÍRÁSA a modell számára — ez megy be a kontextusba
ESZKOZ_SEMA = {
    "name": "ugyfeljegy_statisztika",
    "description": (
        "Egy kurzus 2025-ös ügyféljegyeinek összesített statisztikáját adja vissza: "
        "jegyek száma, összes és leghosszabb megoldási idő órában. "
        "Akkor használd, ha a kérdés SZÁMOLÁST igényel (összeg, darabszám, "
        "maximum). Ne használd, ha a kérdés egy konkrét ügyféljegy leírására "
        "vonatkozik — arra a dokumentumkeresés való."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "kurzus": {
                "type": "string",
                "description": "A kurzus kódja, például 'K-402'. "
                               "Ha elhagyod, az összes kurzusra számol.",
            }
        },
        "required": [],
    },
}


# ---------------------------------------------------------------------------
# 3. Az agenthurok
# ---------------------------------------------------------------------------

MAX_LEPES = 5

def agenthurok(kerdes):
    """A hurok, ami az egész agentikus világot mozgatja.

    Amíg a modell eszközt kér, futtatjuk és visszaadjuk az eredményt.
    Amikor szöveggel válaszol, készen vagyunk. A MAX_LEPES a biztonsági
    fék: e nélkül egy félresiklott modell a végtelenségig próbálkozhatna.
    """
    if kozos.BACKEND != "api":
        print("[BACKEND != 'api' — a hurok helyett kézi bemutató következik]\n")
        print("1. A modell megkapná a kérdést és az eszközleírást.")
        print("2. Ezt kérné vissza (eszközhívás):")
        print('   {"name": "ugyfeljegy_statisztika", "input": {"kurzus": "K-402"}}')
        print("3. A TE kódod lefuttatja:")
        eredmeny = ugyfeljegy_statisztika("K-402")
        print("  ", json.dumps(eredmeny, ensure_ascii=False))
        print("4. Ezt visszaadod a modellnek, ő pedig megfogalmazza a választ.")
        print("\nPróbáld ki a hibás ágat is:")
        print("  ", json.dumps(ugyfeljegy_statisztika("K-999"), ensure_ascii=False))
        return

    import anthropic
    import os
    kliens = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    uzenetek = [{"role": "user", "content": kerdes}]

    for lepes in range(MAX_LEPES):
        valasz = kliens.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            tools=[ESZKOZ_SEMA],
            messages=uzenetek,
        )
        uzenetek.append({"role": "assistant", "content": valasz.content})

        hivasok = [b for b in valasz.content if b.type == "tool_use"]
        if not hivasok:
            szoveg = "".join(b.text for b in valasz.content if b.type == "text")
            print(f"\nVÁLASZ ({lepes + 1} lépés után):\n{szoveg}")
            return

        eredmenyek = []
        for hivas in hivasok:
            print(f"  [lépés {lepes + 1}] eszközhívás: "
                  f"{hivas.name}({hivas.input})")
            kimenet = ugyfeljegy_statisztika(**hivas.input)
            eredmenyek.append({
                "type": "tool_result",
                "tool_use_id": hivas.id,
                "content": json.dumps(kimenet, ensure_ascii=False),
            })
        uzenetek.append({"role": "user", "content": eredmenyek})

    print("Elértük a lépéskorlátot.")


def main():
    kapcsolat = adatbazis_epit()
    darab = kapcsolat.execute("SELECT COUNT(*) FROM ugyfeljegyek").fetchone()[0]
    kapcsolat.close()
    print(f"{darab} ügyféljegy betöltve az adatbázisba.\n")

    print("=" * 74)
    print("KÉRDÉS: Mennyi volt a K-402 ügyféljegyeinek összes megoldási ideje 2025-ben?")
    print("=" * 74)
    agenthurok("Mennyi volt a K-402 ügyféljegyeinek összes megoldási ideje 2025-ben?")


if __name__ == "__main__":
    main()
