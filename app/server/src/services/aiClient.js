const axios = require('axios');

const KNOWN_LOCS = new Set(['Delhi','Mumbai','Bengaluru','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Seattle','London','Paris','Tokyo','India','United States','USA']);
const KNOWN_ORGS = new Set(['Microsoft','Google','OpenAI','Apple','Amazon','Meta','Netflix','Tesla','Infosys','TCS']);

function localExtractEntities(text) {
  const entities = [];
  function add(matchText, label, start, end) {
    if (!matchText || start < 0 || end <= start) return;
    const overlaps = entities.some((e) => start < e.end && end > e.start);
    if (!overlaps) entities.push({ text: matchText, label, start, end });
  }
  for (const loc of KNOWN_LOCS) {
    const re = new RegExp(`\\b${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    for (const match of text.matchAll(re)) { add(match[0], 'LOC', match.index, match.index + match[0].length); }
  }
  const orgPattern = /\b([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*\s+(?:Inc|Corp|Corporation|Company|University|Institute|Labs|Technologies|Systems))\b/g;
  for (const match of text.matchAll(orgPattern)) { add(match[1], 'ORG', match.index, match.index + match[1].length); }
  entities.sort((a, b) => a.start - b.start || a.end - b.end);
  return entities;
}

const NER_SYSTEM_PROMPT = `You are an exact-match Named Entity Recognition API for Hindi and English legal text. 
Extract entities of type: PERSON, LOC, ORG, DATE, LAW_SECTION, MONEY.
You must output a strictly valid JSON object containing an "entities" array. 
Format: { "entities": [ { "text": "exact substring", "label": "TYPE" } ] }
Return ONLY JSON, no markdown formatting. Only extract things that are explicitly in the text.`;

async function callGeminiLLM(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured in backend");

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [{ text: `${NER_SYSTEM_PROMPT}\n\nText: ${text}` }]
      }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" }
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data.candidates[0].content.parts[0].text;
}

async function callGroqLLM(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured in backend");
  
  const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: NER_SYSTEM_PROMPT },
      { role: "user", content: text }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  }, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  return response.data.choices[0].message.content;
}

function exactMatchOffsets(originalText, rawEntities) {
   const entities = [];
   const seen = new Set();
  const originalLower = String(originalText || '').toLowerCase();
   for (let ent of rawEntities) {
    const rawText = (ent && typeof ent.text === 'string') ? ent.text.trim() : '';
    if (!rawText) continue;
    const label = ent.label || ent.type;
      if (!label) continue;
    const key = `${rawText}-${label}`;
      if (seen.has(key)) continue; 
      seen.add(key);

    let index = originalText.indexOf(rawText);
    if (index === -1) {
      const needleLower = rawText.toLowerCase();
      index = originalLower.indexOf(needleLower);
    }
      if (index !== -1) {
         entities.push({
        text: originalText.slice(index, index + rawText.length),
            label: label,
            start: index,
        end: index + rawText.length
         });
      }
   }
   return entities.sort((a,b) => a.start - b.start);
}

async function runBestNER(text) {
  let mappedEntities = [];
  
  // Try Gemini First
  try {
    const rawJson = await callGeminiLLM(text);
    let parsed = JSON.parse(rawJson);
    mappedEntities = exactMatchOffsets(text, parsed.entities || parsed || []);
    if (mappedEntities.length > 0) return mappedEntities;
  } catch (err) {
    console.warn(`[ai] Gemini failed: ${err.message}`);
  }
  
  // Try Groq as fallback
  try {
    const rawJson = await callGroqLLM(text);
    let parsed = JSON.parse(rawJson);
    mappedEntities = exactMatchOffsets(text, parsed.entities || parsed || []);
    if (mappedEntities.length > 0) return mappedEntities;
  } catch (err) {
    console.warn(`[ai] Groq backup failed: ${err.message}`);
  }

  // Final fallback to dev
  return localExtractEntities(text);
}

async function analyzeText(text) {
  return await runBestNER(text);
}

async function analyzeHindiText(text) {
  const mappedEntities = await runBestNER(text);
  return {
    translatedText: text,
    tokensHi: [],
    tokensEn: [],
    alignments: [],
    entitiesEnglish: [],
    entities: mappedEntities
  };
}

module.exports = { analyzeText, analyzeHindiText };
