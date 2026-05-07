import os
from functools import lru_cache

import spacy
from spacy.cli import download as spacy_download


LABEL_MAP = {
    # spaCy labels
    "PERSON": "PERSON",
    "ORG": "ORG",
    "GPE": "LOC",
    "LOC": "LOC",
    "FAC": "LOC",
}


@lru_cache(maxsize=1)
def get_nlp():
    model_name = os.getenv("SPACY_MODEL", "en_core_web_trf")

    try:
        return spacy.load(model_name)
    except OSError:
        # Fallback to a small model if the preferred model isn't installed.
        fallback = "en_core_web_sm"
        try:
            return spacy.load(fallback)
        except OSError:
            spacy_download(fallback)
            return spacy.load(fallback)


def extract_entities(text: str):
    nlp = get_nlp()
    doc = nlp(text)

    entities = []
    for ent in doc.ents:
        mapped = LABEL_MAP.get(ent.label_, None)
        if not mapped:
            continue
        entities.append(
            {
                "text": ent.text,
                "label": mapped,
                "start": int(ent.start_char),
                "end": int(ent.end_char),
            }
        )

    # Ensure stable ordering for highlighting
    entities.sort(key=lambda e: (e["start"], e["end"]))
    return entities
