import os
import re
from dataclasses import dataclass
from functools import lru_cache

import torch
import regex as uni_regex
from simalign import SentenceAligner
from transformers import MarianMTModel, MarianTokenizer

from .ner import LABEL_MAP, get_nlp


_WORD_RE = uni_regex.compile(
    r"(?:\p{L}|\p{M}|\p{N})+|[^\p{L}\p{M}\p{N}\s]",
    flags=uni_regex.UNICODE,
)


@dataclass(frozen=True)
class _Tok:
    index: int
    text: str
    start: int
    end: int


def _looks_like_hindi(text: str) -> bool:
    # Devanagari block: U+0900..U+097F
    matches = re.findall(r"[\u0900-\u097F]", text)
    if not matches:
        return False

    total = len(text)
    devanagari = len(matches)
    # Reasonable heuristics for an “article” vs a single name.
    return devanagari >= 20 and (devanagari / max(total, 1)) >= 0.05


def _split_hindi_sentences(text: str) -> list[tuple[int, int, str]]:
    # Minimal, robust sentence splitter for Hindi + mixed punctuation.
    # Splits on danda (।), newlines, and common latin sentence terminators.
    boundaries = set("।\n.!?")
    parts: list[tuple[int, int, str]] = []

    start = 0
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in boundaries:
            end = i + 1
            seg = text[start:end]
            if seg.strip():
                parts.append((start, end, seg))
            start = end
        i += 1

    if start < n:
        seg = text[start:n]
        if seg.strip():
            parts.append((start, n, seg))

    # If the user pasted something with no punctuation (single long block),
    # chunk it to keep translation lengths sane.
    if len(parts) <= 1 and n > 800:
        chunked: list[tuple[int, int, str]] = []
        chunk_start = 0
        while chunk_start < n:
            chunk_end = min(n, chunk_start + 600)
            # Try to break at whitespace.
            ws = text.rfind(" ", chunk_start, chunk_end)
            if ws != -1 and ws > chunk_start + 200:
                chunk_end = ws
            seg = text[chunk_start:chunk_end]
            if seg.strip():
                chunked.append((chunk_start, chunk_end, seg))
            chunk_start = chunk_end
        return chunked

    return parts


def _tokens_with_offsets(text: str) -> list[_Tok]:
    out: list[_Tok] = []
    for idx, m in enumerate(_WORD_RE.finditer(text)):
        out.append(_Tok(index=idx, text=m.group(0), start=m.start(), end=m.end()))
    return out


def _trim_span(text: str, start: int, end: int) -> tuple[int, int]:
    # Keep offsets stable and avoid highlighting whitespace.
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return start, end


@lru_cache(maxsize=1)
def _get_translator():
    model_name = os.getenv("HI_EN_MODEL", "Helsinki-NLP/opus-mt-hi-en")
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)

    # Keep this conservative for compatibility (CPU). You can change this later.
    device = os.getenv("TRANSLATE_DEVICE", "cpu").lower()
    if device == "mps" and torch.backends.mps.is_available():
        model = model.to("mps")
        device = "mps"
    elif device == "cuda" and torch.cuda.is_available():
        model = model.to("cuda")
        device = "cuda"
    else:
        model = model.to("cpu")
        device = "cpu"

    return tokenizer, model, device


def _translate_batch(texts: list[str]) -> list[str]:
    tokenizer, model, device = _get_translator()
    encoded = tokenizer(
        texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=int(os.getenv("TRANSLATE_MAX_LENGTH", "512")),
    )
    encoded = {k: v.to(device) for k, v in encoded.items()}
    with torch.inference_mode():
        generated = model.generate(
            **encoded,
            num_beams=int(os.getenv("TRANSLATE_BEAMS", "4")),
            max_new_tokens=int(os.getenv("TRANSLATE_MAX_NEW_TOKENS", "256")),
        )
    out = tokenizer.batch_decode(generated, skip_special_tokens=True)
    return [s.strip() for s in out]


@lru_cache(maxsize=1)
def _get_aligner():
    # Multilingual alignment model (downloads on first use).
    model = os.getenv("ALIGN_MODEL", "bert")
    token_type = os.getenv("ALIGN_TOKEN_TYPE", "bpe")
    # simalign expects single-letter codes in matching_methods:
    # a=inter, m=mwmf, i=itermax, f=fwd, r=rev
    matching_raw = os.getenv("ALIGN_MATCHING", "m")
    parts = [p.strip().lower() for p in matching_raw.split(",") if p.strip()]

    name_to_code = {
        "a": "a",
        "m": "m",
        "i": "i",
        "f": "f",
        "r": "r",
        "inter": "a",
        "mwmf": "m",
        "itermax": "i",
        "fwd": "f",
        "rev": "r",
    }

    codes = ""
    for p in parts:
        if p in name_to_code:
            codes += name_to_code[p]
        else:
            raise ValueError(f"Unsupported ALIGN_MATCHING value: {p}")

    if not codes:
        codes = "m"

    return SentenceAligner(model=model, token_type=token_type, matching_methods=codes)


def analyze_hindi_text(text: str):
    if not _looks_like_hindi(text):
        raise ValueError("Input does not look like Hindi/Devanagari text")

    nlp = get_nlp()
    aligner = _get_aligner()

    segments = _split_hindi_sentences(text)
    seg_texts = [seg for (_, _, seg) in segments]
    translations = _translate_batch(seg_texts)

    translated_text = "".join(translations)

    tokens_hi: list[dict] = []
    tokens_en: list[dict] = []
    alignments: list[dict] = []
    entities_en: list[dict] = []
    entities_hi: list[dict] = []

    hi_tok_base = 0
    en_tok_base = 0
    en_char_base = 0

    for (seg_start, seg_end, seg_hi), seg_en in zip(segments, translations, strict=True):
        hi_toks = _tokens_with_offsets(seg_hi)
        en_toks = _tokens_with_offsets(seg_en)

        for t in hi_toks:
            tokens_hi.append({"index": hi_tok_base + t.index, "text": t.text, "start": seg_start + t.start, "end": seg_start + t.end})
        for t in en_toks:
            tokens_en.append({"index": en_tok_base + t.index, "text": t.text, "start": en_char_base + t.start, "end": en_char_base + t.end})

        hi_words = [t.text for t in hi_toks]
        en_words = [t.text for t in en_toks]

        # Alignment at word level
        aligns = set()
        if hi_words and en_words:
            try:
                primary = os.getenv("ALIGN_PRIMARY")
                if not primary:
                    first = (os.getenv("ALIGN_MATCHING", "m").split(",")[0] or "m").strip().lower()
                    code_to_name = {
                        "a": "inter",
                        "m": "mwmf",
                        "i": "itermax",
                        "f": "fwd",
                        "r": "rev",
                        "inter": "inter",
                        "mwmf": "mwmf",
                        "itermax": "itermax",
                        "fwd": "fwd",
                        "rev": "rev",
                    }
                    primary = code_to_name.get(first, "mwmf")
                aligns = set(aligner.get_word_aligns(hi_words, en_words).get(primary, []))
            except Exception:
                aligns = set()

        en_to_hi: dict[int, set[int]] = {}
        for hi_i, en_i in aligns:
            en_to_hi.setdefault(en_i, set()).add(hi_i)
            alignments.append({"hi": hi_tok_base + hi_i, "en": en_tok_base + en_i})

        # English NER on translated segment
        doc_en = nlp(seg_en)
        for ent in doc_en.ents:
            mapped = LABEL_MAP.get(ent.label_, None)
            if not mapped:
                continue

            e_start = int(ent.start_char)
            e_end = int(ent.end_char)

            # English token indices overlapping this entity
            en_idx: list[int] = []
            for t in en_toks:
                if t.start < e_end and t.end > e_start:
                    en_idx.append(t.index)

            hi_idx_set: set[int] = set()
            for i in en_idx:
                hi_idx_set |= en_to_hi.get(i, set())

            if not hi_idx_set:
                # No alignment signal; skip mapping to Hindi.
                continue

            hi_idx = sorted(hi_idx_set)
            h_start = min(hi_toks[i].start for i in hi_idx)
            h_end = max(hi_toks[i].end for i in hi_idx)
            h_start, h_end = _trim_span(seg_hi, h_start, h_end)
            if h_end <= h_start:
                continue

            global_h_start = seg_start + h_start
            global_h_end = seg_start + h_end

            entities_en.append(
                {
                    "text": ent.text,
                    "label": mapped,
                    "start": en_char_base + e_start,
                    "end": en_char_base + e_end,
                }
            )

            entities_hi.append(
                {
                    "text": text[global_h_start:global_h_end],
                    "label": mapped,
                    "start": global_h_start,
                    "end": global_h_end,
                    "english_text": ent.text,
                    "english_start": en_char_base + e_start,
                    "english_end": en_char_base + e_end,
                    "english_token_indices": [en_tok_base + i for i in en_idx],
                    "hindi_token_indices": [hi_tok_base + i for i in hi_idx],
                }
            )

        hi_tok_base += len(hi_toks)
        en_tok_base += len(en_toks)
        en_char_base += len(seg_en)

    # Stable ordering + basic dedupe
    dedup: dict[tuple[int, int, str], dict] = {}
    for e in entities_hi:
        key = (int(e["start"]), int(e["end"]), str(e["label"]))
        if key not in dedup:
            dedup[key] = e
    entities_hi = list(dedup.values())
    entities_hi.sort(key=lambda e: (e["start"], e["end"]))

    entities_en.sort(key=lambda e: (e["start"], e["end"]))

    return {
        "translatedText": translated_text,
        "tokensHi": tokens_hi,
        "tokensEn": tokens_en,
        "alignments": alignments,
        "entitiesEnglish": entities_en,
        "entities": entities_hi,
    }
