"""kozos.py — a labor közös alkatrészei.

Itt dől el, MELYIK MOTORRAL fut az egész projekt. Egyetlen sort kell
átírnod alább (BACKEND), és minden más script követi.

    "beepitett" : a numpy-n kívül semmit nem kell telepíteni, nincs kulcs,
                  nincs internet. Keres és promptot állít össze; válasz-
                  generálás helyett a modellnek szánt promptot írja ki.
                  Egy játék-embedding, ami a MECHANIZMUST mutatja meg.
                  Szemantikát NEM tud. Tanuláshoz tökéletes, éles rendszerbe
                  soha ne kerüljön.
    "lokalis"   : igazi embedding-modell a saját gépeden (az első futásnál
                  letölti, utána offline is megy). Válaszgeneráló modellt
                  nem futtat. Telepítés: python -m pip install sentence-transformers
    "api"       : Anthropic API a generáláshoz (+ lokális embedding).
                  Kell hozzá: python -m pip install anthropic sentence-transformers,
                  és egy ANTHROPIC_API_KEY
                  környezeti változó.
"""

import hashlib
import os
import re

import numpy as np

# ============================================================================
# ITT ÁLLÍTSD BE. Kezdd a "beepitett" móddal.
# ============================================================================
BACKEND = "beepitett"

DIMENZIO = 256  # a beépített embedder vektorhossza


# ---------------------------------------------------------------------------
# 1. EMBEDDING — szövegdarab -> vektor
# ---------------------------------------------------------------------------

def _szavakra_bont(szoveg):
    """Kisbetűsít és szavakra vág. A magyar ékezeteket megtartjuk.

    A \\w+ mintázat betűket és számokat fog; a re.UNICODE alapértelmezett
    Python 3-ban, tehát az 'ő' és 'ű' is szónak számít.
    A kódokban lévő kötőjelet külön kezeljük: a 'VK-402-2K' egyben
    marad, mert az egy azonosító, nem három szó.
    """
    szoveg = szoveg.lower()
    # előbb a kötőjeles azonosítók (legalább egy betű + kötőjel + számjegy)
    azonositok = re.findall(r"[a-zá-ű]+-\d+[a-z0-9\-]*", szoveg)
    # aztán a közönséges szavak
    szavak = re.findall(r"[a-zá-ű0-9]+", szoveg)
    return azonositok + szavak


def _beepitett_embedding(szoveg):
    """Játék-embedding: hash-alapú "bag of words" vektor.

    Minden szót egy determinisztikus hash alapján beteszünk egy vödörbe
    (0..DIMENZIO-1), és ott növeljük az értéket. Két szöveg vektora akkor
    lesz hasonló, ha SOK KÖZÖS SZAVUK van.

    Szemantikát ez NEM tud: a 'nem tudok belépni' és a 'bejelentkezési hiba'
    itt két teljesen különböző vektor lesz. Egy igazi embedding-modell
    ("lokalis" mód) az ilyen jelentésbeli hasonlóságokat is felismerheti,
    de hogy a te anyagodon mennyit javít (és javít-e egyáltalán), azt a
    8. lépésben méréssel látod. Ez a labor egyik legfontosabb tanulsága.
    """
    vektor = np.zeros(DIMENZIO, dtype=np.float32)
    for szo in _szavakra_bont(szoveg):
        # md5: determinisztikus, azaz ugyanaz a szó mindig ugyanabba a vödörbe
        h = hashlib.md5(szo.encode("utf-8")).hexdigest()
        vodor = int(h, 16) % DIMENZIO
        vektor[vodor] += 1.0
    return vektor


_lokalis_modell = None


def _lokalis_embedding(szoveg):
    """Igazi embedding-modell, a saját gépeden futtatva."""
    global _lokalis_modell
    if _lokalis_modell is None:
        from sentence_transformers import SentenceTransformer
        # többnyelvű modell, a magyart is ismeri
        _lokalis_modell = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
    return np.asarray(_lokalis_modell.encode(szoveg), dtype=np.float32)


def embedding(szoveg):
    """Ez a függvény a kapcsoló. Minden más kód EZT hívja, nem a fentieket."""
    if BACKEND == "beepitett":
        nyers = _beepitett_embedding(szoveg)
    else:
        nyers = _lokalis_embedding(szoveg)
    return normalizal(nyers)


def normalizal(vektor):
    """Egységhosszúra osztjuk a vektort.

    Miért? Mert utána a koszinusz-hasonlóság = egyszerű skalárszorzat.
    A hossz elosztása után a vektor csak IRÁNYT hordoz, nagyságot nem —
    így egy hosszú és egy rövid szövegdarab összemérhető lesz.
    """
    hossz = np.linalg.norm(vektor)
    if hossz == 0:
        return vektor
    return vektor / hossz


# ---------------------------------------------------------------------------
# 2. GENERÁLÁS — prompt -> válasz
# ---------------------------------------------------------------------------

def valaszol(prompt, rendszer_uzenet="", max_token=1000):
    """Elküldi a promptot a modellnek, és visszaadja a szöveges választ.

    "api" módban valódi hívás megy ki. Minden más módban NEM hívunk semmit,
    hanem visszaadjuk magát az összeállított promptot — így a labor első
    felét kulcs nélkül is végig tudod csinálni, és a saját szemeddel látod,
    mit küldenél ki. Ez amúgy hasznos szokás éles fejlesztésnél is.
    """
    if BACKEND != "api":
        vonal = "-" * 60
        return (
            "[NINCS MODELLHÍVÁS — BACKEND = '%s']\n"
            "Ezt küldenéd el a modellnek.\n"
            "%s\nRENDSZERÜZENET:\n%s\n%s\nFELHASZNÁLÓI ÜZENET:\n%s"
            % (BACKEND, vonal, rendszer_uzenet or "(nincs)", vonal, prompt)
        )

    import anthropic
    kliens = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    valasz = kliens.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_token,
        system=rendszer_uzenet,
        messages=[{"role": "user", "content": prompt}],
    )
    # a válasz több blokkból is állhat; a szövegeseket fűzzük össze
    return "".join(blokk.text for blokk in valasz.content if blokk.type == "text")


if __name__ == "__main__":
    print("BACKEND =", BACKEND)
    v = embedding("Nem tudok belépni a fiókomba.")
    print("vektor hossza:", len(v))
    print("normája:", round(float(np.linalg.norm(v)), 6))
    print("első 8 elem:", np.round(v[:8], 4))
