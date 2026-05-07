import { ENTITY_SYSTEM_PROMPT } from './prompts/nerSystemPrompt.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const MODEL = import.meta.env.VITE_GROQ_MODEL;

export async function askGroq({ userMessage, nerEntities, documentText, conversationHistory = [] }) {
  const systemPrompt = buildSystemPrompt(nerEntities, documentText);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userMessage }
  ];

  // Making backend request instead of hitting Groq directly to avoid API detection
  const response = await fetch(`${API_URL}/ner/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // passing credentials to pass requireAuth in backend
    credentials: 'include',
    body: JSON.stringify({
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      stream: true
    })
  });

  if (!response.ok) throw new Error(`Analysis service error: ${response.status}`);
  return response.body;
}

function buildSystemPrompt(entities, rawText) {
  const entitySummary = entities && entities.length > 0
    ? entities.map(e => `- ${e.text} (${e.type || e.label}) at position ${e.start}-${e.end}`).join('\n')
    : 'No entities extracted yet.';

  return `${ENTITY_SYSTEM_PROMPT}

## Current Document Context
Raw text length: ${rawText ? rawText.length : 0} characters.

## Extracted NER Entities
${entitySummary}

## Your Role
You are analyzing this Hindi/English document. Use the extracted entities above to answer questions, find patterns, flag risks, and provide legal insights. Always cite specific entities by name when referencing them. Respond in the same language the user asks in (Hindi or English). Be concise and actionable.`;
}

export async function streamGroqResponse(readableStream, onChunk, onDone) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // In some cases Groq chunks have multiple lines
    const lines = chunk.split('\n').filter(l => l.trim() && l.startsWith('data: '));

    for (const line of lines) {
      const data = line.replace('data: ', '').trim();
      if (data === '[DONE]') { onDone(fullText); return; }
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content || '';
        if (token) { fullText += token; onChunk(token); }
      } catch {}
    }
  }
  onDone(fullText);
}
