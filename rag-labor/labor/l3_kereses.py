"""l3_kereses.py — keresés: vektor + kulcsszó + a kettő összefésülése.

Futtatás:  python3 l3_kereses.py "nem tudok belépni"
       (paraméter nélkül lefuttat néhány beépített példakérdést)

Három keresőt építünk meg, és MELLÉTESSZÜK az eredményeiket. A tanulság
akkor jön át, ha látod, melyik kérdésen melyik nyer.
"""

import math
import sqlite3
import sys
from collections import Counter
from pathlib import Path

import numpy as np

import kozos

MAPPA = Path(__file__).parent
ADATBAZIS = MAPPA / "index.sqlite"
VEKTOROK = MAPPA / "vektorok.npy"


def index_betolt():
    """Beolvassa a mátrixot és a hozzá tartozó sorokat.

    A visszatérés két dolog: a mátrix, és egy lista, amiben a sor sorszáma
    ugyanaz, mint a mátrix sorindexe. Ez a párhuzam tartja össze a rendszert.
    """
    matrix = np.load(VEKTOROK)
    kapcsolat = sqlite3.connect(ADATBAZIS)
    kapcsolat.row_factory = sqlite3.Row  # így név szerint indexelhetünk
    sorok = kapcsolat.execute(
        "SELECT * FROM darabok ORDER BY sor"
    ).fetchall()
    kapcsolat.close()
    return matrix, [dict(s) for s in sorok]


# ---------------------------------------------------------------------------
# Metaadat-szűrés (mindkét keresési ág ugyanezt használja)
# ---------------------------------------------------------------------------

def megengedett(sor, kurzus_szuro):
    """Az adott kurzus darabjai, plusz az általános és a több kurzusra
    vonatkozó darabok (szabályzatok, ügyféljegy-kivonat)."""
    return sor["kurzus"] in (kurzus_szuro, "altalanos", "tobb")


def _szurt_rangsor(pontszamok, sorok, k, kurzus_szuro):
    """Rangsorolás a szűrő után. A kizárt darabok -inf pontszámot kapnak,
    és KI IS kerülnek a listából: ha csak a végére tennénk őket, akkor
    k nagyobb értékénél (vagy kevés megengedett darabnál) visszajönnének.
    Ha kevesebb megengedett találat van k-nál, rövidebb listát adunk vissza."""
    if kurzus_szuro:
        # a kért szűrés ne maradjon el észrevétlenül, ha nincsenek meg a metaadatok
        if sorok is None or len(sorok) != len(pontszamok):
            raise ValueError("A kurzusszűréshez a darabok metaadatai (sorok) is "
                             "kellenek, a pontszámokkal azonos hosszban.")
        for i, sor in enumerate(sorok):
            if not megengedett(sor, kurzus_szuro):
                pontszamok[i] = -np.inf
    # argsort: a rendezéshez tartozó INDEXEKET adja vissza, nem az értékeket.
    # A [::-1] megfordítja (csökkenő sorrend).
    rendezett = np.argsort(pontszamok)[::-1]
    return [(int(i), float(pontszamok[i])) for i in rendezett
            if np.isfinite(pontszamok[i])][:k]


# ---------------------------------------------------------------------------
# A) VEKTOROS KERESÉS
# ---------------------------------------------------------------------------

def vektor_kereses(kerdes, matrix, sorok, k=5, kurzus_szuro=None):
    """Koszinusz-hasonlóság a kérdés és minden darab között.

    Mivel minden vektor egységhosszú (lásd kozos.normalizal), a koszinusz
    egyszerű skalárszorzat. A 'matrix @ kerdes_vektor' egyetlen művelettel
    kiszámolja MINDEN darabra egyszerre — ez a numpy értelme.
    """
    kv = kozos.embedding(kerdes)
    pontszamok = matrix @ kv  # alakja: (darabszám,)
    return _szurt_rangsor(pontszamok, sorok, k, kurzus_szuro)


# ---------------------------------------------------------------------------
# B) KULCSSZAVAS KERESÉS (BM25)
# ---------------------------------------------------------------------------

class BM25:
    """Klasszikus kulcsszavas pontozás, kb. 30 sorban.

    A gondolat: egy szó akkor sokat érő, ha (1) sokszor szerepel a
    dokumentumban, de (2) ritka az egész korpuszban. A 'a' és a 'nem'
    mindenhol ott van, tehát semmit nem árul el; a 'VK-405-1E' kevés helyen,
    tehát nagyon sokat.
    """

    def __init__(self, dokumentumok, k1=1.5, b=0.75):
        # dokumentumok: szövegek listája
        self.tokenek = [kozos._szavakra_bont(d) for d in dokumentumok]
        self.hosszak = [len(t) for t in self.tokenek]
        self.atlaghossz = sum(self.hosszak) / len(self.hosszak)
        self.k1 = k1  # telítési paraméter: mennyire számít az ismétlődés
        self.b = b    # hosszra normálás erőssége
        self.N = len(dokumentumok)

        # hányféle dokumentumban fordul elő egy szó (document frequency)
        self.df = Counter()
        for t in self.tokenek:
            for szo in set(t):  # set(): egy dokumentumon belül csak egyszer
                self.df[szo] += 1

        # előre kiszámolt szógyakoriságok dokumentumonként
        self.tf = [Counter(t) for t in self.tokenek]

    def idf(self, szo):
        """Inverz dokumentumgyakoriság: a ritka szó sokat ér."""
        n = self.df.get(szo, 0)
        return math.log(1 + (self.N - n + 0.5) / (n + 0.5))

    def pontoz(self, kerdes):
        """Minden dokumentumra ad egy pontszámot a kérdés alapján."""
        kerdes_tokenek = kozos._szavakra_bont(kerdes)
        pontszamok = np.zeros(self.N, dtype=np.float32)
        for i in range(self.N):
            osszeg = 0.0
            for szo in kerdes_tokenek:
                f = self.tf[i].get(szo, 0)
                if f == 0:
                    continue
                # a BM25 képlet: a gyakoriság telítődik, a hossz normálódik
                szamlalo = f * (self.k1 + 1)
                nevezo = f + self.k1 * (
                    1 - self.b + self.b * self.hosszak[i] / self.atlaghossz
                )
                osszeg += self.idf(szo) * szamlalo / nevezo
            pontszamok[i] = osszeg
        return pontszamok


def bm25_kereses(kerdes, bm25, k=5, sorok=None, kurzus_szuro=None):
    """A szűrőhöz a sorok (metaadatok) is kellenek; nélkülük ValueError jön.
    Szűrő nélkül a sorok elhagyhatók."""
    pontszamok = bm25.pontoz(kerdes)
    return _szurt_rangsor(pontszamok, sorok, k, kurzus_szuro)


# ---------------------------------------------------------------------------
# C) ÖSSZEFÉSÜLÉS (reciprok rangfúzió)
# ---------------------------------------------------------------------------

def rangfuzio(listak, k=5, konstans=60):
    """Két találati listát fésül össze a RANGOK alapján, nem a pontszámok
    alapján.

    Miért? Mert a két pontszám más skálán mozog: a koszinusz-hasonlóság
    legfeljebb 1 (a beépített, nemnegatív vektoroknál 0 és 1 közötti, egy
    igazi modellnél negatív is lehet), a BM25 meg lehet 12,3. A nyers
    értékek összege megbízhatatlan. A rang viszont összemérhető: az első
    hely az első hely, bármelyik keresőnél.

    A képlet minden listára: 1 / (konstans + rang). A 60-as konstans a
    módszer eredeti cikkéből származik (Cormack, Clarke, Büttcher, 2009),
    és azóta is gyakran használják; azt szabályozza, mennyivel ér többet az
    1. hely a 10.-nél.
    """
    pontok = {}
    for lista in listak:
        for rang, (index, _pontszam) in enumerate(lista):
            pontok[index] = pontok.get(index, 0.0) + 1.0 / (konstans + rang)
    rendezett = sorted(pontok.items(), key=lambda p: p[1], reverse=True)
    return rendezett[:k]


# ---------------------------------------------------------------------------
# Bemutató
# ---------------------------------------------------------------------------

def kiir(cim, talalatok, sorok):
    print(f"\n  {cim}")
    for helyezes, (index, pontszam) in enumerate(talalatok, start=1):
        sor = sorok[index]
        print(f"    {helyezes}. [{pontszam:6.3f}] {sor['forras_fajl'][:34]:34s} "
              f"| {sor['fejezet'][:38]}")


def main():
    matrix, sorok = index_betolt()
    bm25 = BM25([s["szoveg"] for s in sorok])

    if len(sys.argv) > 1:
        kerdesek = [" ".join(sys.argv[1:])]
    else:
        kerdesek = [
            "nem tudok belépni",                  # szemantikus kérdés
            "VK-405-1E",                          # pontos azonosító
            "hány pontot kell elérni a szintfelmérőn",
        ]

    for kerdes in kerdesek:
        print("=" * 78)
        print(f"KÉRDÉS: {kerdes}")
        v = vektor_kereses(kerdes, matrix, sorok, k=3)
        b = bm25_kereses(kerdes, bm25, k=3)
        f = rangfuzio([vektor_kereses(kerdes, matrix, sorok, k=10),
                       bm25_kereses(kerdes, bm25, k=10)], k=3)
        kiir("VEKTOR", v, sorok)
        kiir("BM25  ", b, sorok)
        kiir("FÚZIÓ ", f, sorok)


if __name__ == "__main__":
    main()
