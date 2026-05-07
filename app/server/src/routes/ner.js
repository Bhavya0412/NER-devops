const express = require('express');
const { z } = require('zod');

const Article = require('../models/Article');
const { requireAuth } = require('../middleware/auth');
const { analyzeHindiText, analyzeText } = require('../services/aiClient');

const router = express.Router();

const analyzeSchema = z.object({
  text: z.string().min(1).max(20000),
  language: z.enum(['auto', 'en', 'hi']).optional()
});

function looksHindi(text) {
  const matches = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (matches === 0) return false;
  const total = text.length || 1;
  return matches >= 20 && matches / total >= 0.05;
}

router.post('/analyze', requireAuth, async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const { text } = parsed.data;
  const language = parsed.data.language || 'auto';

  let entities = [];
  let languageResolved = 'en';
  let translatedText;
  let entitiesEnglish = [];
  let entityMappings = [];
  let tokensHi = [];
  let tokensEn = [];
  let alignments = [];

  const treatAsHindi = language === 'hi' || (language === 'auto' && looksHindi(text));
  if (treatAsHindi) {
    languageResolved = 'hi';
    const result = await analyzeHindiText(text);

    translatedText = result.translatedText;
    entitiesEnglish = Array.isArray(result.entitiesEnglish) ? result.entitiesEnglish : [];
    entityMappings = Array.isArray(result.entities) ? result.entities : [];
    tokensHi = Array.isArray(result.tokensHi) ? result.tokensHi : [];
    tokensEn = Array.isArray(result.tokensEn) ? result.tokensEn : [];
    alignments = Array.isArray(result.alignments) ? result.alignments : [];

    // Keep the main "entities" field backwards-compatible for highlighting.
    entities = entityMappings.map((e) => ({
      text: e.text,
      label: e.label,
      start: e.start,
      end: e.end
    }));
  } else {
    entities = await analyzeText(text);
  }

  const article = await Article.create({
    userId: req.user.id,
    text,
    entities,
    language: languageResolved,
    translatedText,
    entitiesEnglish,
    entityMappings: entityMappings.map((e) => ({
      text: e.text,
      label: e.label,
      start: e.start,
      end: e.end,
      englishText: e.english_text,
      englishStart: e.english_start,
      englishEnd: e.english_end,
      englishTokenIndices: e.english_token_indices || [],
      hindiTokenIndices: e.hindi_token_indices || []
    }))
  });

  return res.status(201).json({
    article: {
      id: String(article._id),
      userId: String(article.userId),
      text: article.text,
      entities: article.entities,
      language: article.language,
      translatedText: article.translatedText,
      entitiesEnglish: article.entitiesEnglish,
      entityMappings: article.entityMappings,
      analysis: article.language === 'hi' ? { tokensHi, tokensEn, alignments } : undefined,
      createdAt: article.createdAt
    }
  });
});

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      ...req.body
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(groqPayload)
    });
    
    if (!response.ok) {
       return res.status(response.status).send(await response.text());
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
