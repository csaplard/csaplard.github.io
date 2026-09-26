# RAG-labor — ügyfélszolgálati dokumentumasszisztens nulláról

Ez a projekt a *„RAG-labor: építsünk egyet”* kézikönyv mellé tartozik
(https://csaplard.github.io/rag-labor/). Minden script önállóan futtatható,
és mindegyik kiír valamit, amit érdemes megnézni.

A dokumentumok egy kitalált, online tanfolyamokat szervező oktatási platform
belső anyagai. Minden név, kód és szám kitalált.

## Indulás (3 perc)

```bash
cd labor
python3 keszits_korpuszt.py     # létrehozza a 6 dokumentumot
python3 l1_darabolas.py         # darabokra vágja őket
python3 l2_index.py             # vektorokat számol, indexet épít
python3 l3_kereses.py           # háromféle keresés összehasonlítása
python3 l4_valasz.py "milyen vizsgával zárul a K-402"
python3 l5_eval.py              # MÉRÉS — ez a legfontosabb
python3 l6_eszkoz.py            # eszközhívás, agenthurok
```

Semmit nem kell telepíteni a numpyon kívül (`pip install numpy`), és nem
kell API-kulcs. Az alapértelmezett mód egy szándékosan buta, beépített
embedding — hogy lásd a mechanizmust, mielőtt igazi modellre váltasz.

## A három üzemmód

A `kozos.py` tetején egyetlen sor:

```python
BACKEND = "beepitett"   # -> "lokalis" -> "api"
```

| mód | mit csinál | mi kell hozzá |
|---|---|---|
| `beepitett` | hash-alapú játék-embedding, nincs modellhívás | semmi |
| `lokalis` | igazi többnyelvű embedding a gépeden | `pip install sentence-transformers` |
| `api` | lokális embedding + valódi generálás | `pip install anthropic`, `ANTHROPIC_API_KEY` |

**A labor fő kísérlete:** futtasd le az `l5_eval.py`-t `beepitett` módban,
jegyezd fel a számokat, majd válts `lokalis`-ra, építsd újra az indexet
(`python3 l2_index.py`), és mérj újra. A különbség fogja megmutatni, mit
ad valójában egy embedding-modell.

## Fájlok

| fájl | mit csinál |
|---|---|
| `kozos.py` | a kapcsoló: embedding és modellhívás, minden más ezt használja |
| `keszits_korpuszt.py` | a szintetikus ügyfélszolgálati dokumentumok |
| `l1_darabolas.py` | szerkezet szerinti darabolás + metaadat |
| `l2_index.py` | SQLite + numpy index építése |
| `l3_kereses.py` | vektorkeresés, BM25, reciprok rangfúzió |
| `l4_valasz.py` | kontextusépítés, forrásjelölési szerződés |
| `l5_eval.py` | golden set, recall@k, típusonkénti bontás |
| `l6_eszkoz.py` | eszközleírás, agenthurok, ügyféljegy-statisztika |
| `kerdesek.json` | a golden set — ezt bővítsd, ahogy hibákat találsz |

## Ha elakadsz

Töröld a generált fájlokat, és kezdd elölről:

```bash
rm -f darabok.json index.sqlite vektorok.npy ugyfeljegyek.sqlite
```

© 2026 Csaplár Dániel · CC BY-NC-SA 4.0
