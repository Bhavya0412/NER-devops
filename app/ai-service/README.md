# AI Service (FastAPI + spaCy)

## Endpoints

- `GET /health`
- `POST /analyze`
- `POST /analyze-hindi`

### Request

```json
{ "text": "Barack Obama visited Microsoft in Seattle." }
```

### Response

```json
{
  "entities": [
    { "text": "Barack Obama", "label": "PERSON", "start": 0, "end": 12 },
    { "text": "Microsoft", "label": "ORG", "start": 21, "end": 30 },
    { "text": "Seattle", "label": "LOC", "start": 34, "end": 41 }
  ]
}
```

## Local run

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_trf
uvicorn app.main:app --reload --port 8000
```

## Hindi NER (Translate + Align)

`POST /analyze-hindi` accepts Hindi/Devanagari text, translates it to English, runs English spaCy NER on the translation, and then aligns English word-tokens back to Hindi word-tokens.

The response includes:
- `translatedText`: English translation used for NER
- `tokensHi`, `tokensEn`: token lists with offsets
- `alignments`: word alignment pairs (Hindi token index ↔ English token index)
- `entitiesEnglish`: entities detected in English translation
- `entities`: Hindi-mapped entities (with extra fields like `english_text`, `english_token_indices`, `hindi_token_indices`)
