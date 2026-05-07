from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


class HindiAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


class Entity(BaseModel):
    text: str
    label: str
    start: int
    end: int


class Token(BaseModel):
    index: int
    text: str
    start: int
    end: int


class AlignmentPair(BaseModel):
    hi: int
    en: int


class EntityMapping(Entity):
    english_text: str | None = None
    english_start: int | None = None
    english_end: int | None = None
    english_token_indices: list[int] = []
    hindi_token_indices: list[int] = []


class AnalyzeResponse(BaseModel):
    entities: list[Entity]


class HindiAnalyzeResponse(BaseModel):
    translatedText: str
    tokensHi: list[Token]
    tokensEn: list[Token]
    alignments: list[AlignmentPair]
    entitiesEnglish: list[Entity]
    entities: list[EntityMapping]
