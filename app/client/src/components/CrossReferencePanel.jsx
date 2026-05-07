import { useState } from 'react';
import { askGroq, streamGroqResponse } from '../services/groqService';

export default function CrossReferencePanel({ doc1Entities, doc2Entities, doc1Text, doc2Text }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  function findSharedEntities() {
    const doc1Names = new Set(doc1Entities.map(e => e.text.toLowerCase()));
    return doc2Entities.filter(e => doc1Names.has(e.text.toLowerCase()));
  }

  async function runCrossAnalysis() {
    setLoading(true);
    setAnalysis('');
    const shared = findSharedEntities();
    const prompt = `Two documents have been processed. Shared entities found: ${shared.map(e => e.text + ' (' + (e.type || e.label) + ')').join(', ')}. What is the likely relationship between these two documents? Are the shared persons/locations appearing in the same or conflicting roles? Flag any concerns.`;
    try {
      const stream = await askGroq({ userMessage: prompt, nerEntities: [...doc1Entities, ...doc2Entities], documentText: doc1Text + '\n---\n' + doc2Text, conversationHistory: [] });
      await streamGroqResponse(stream, token => setAnalysis(prev => prev + token), () => setLoading(false));
    } catch { setLoading(false); }
  }

  const shared = findSharedEntities();

  return (
    <div style={{ padding: '16px', color: '#e8e8f0', fontFamily: 'Inter, sans-serif' }}>
      <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Cross-Document Analysis</h3>
      <div style={{ fontSize: '12px', color: '#a0a0c0', marginBottom: '12px' }}>
        {shared.length} shared entities found: {shared.map(e => e.text).join(', ') || 'None'}
      </div>
      <button onClick={runCrossAnalysis} disabled={loading} style={{ padding: '8px 16px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
        {loading ? 'Analyzing...' : 'Run AI Cross-Reference Analysis'}
      </button>
      {analysis && <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: '1.7', color: '#c0c0d8' }}>{analysis}</div>}
    </div>
  );
}
