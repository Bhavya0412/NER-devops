import { useState, useEffect } from 'react';
import { askGroq, streamGroqResponse } from '../services/groqService';

export default function EntityInsightCard({ entity, allEntities, documentText, onClose, position }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entity) return;
    generateInsight();
  }, [entity]);

  async function generateInsight() {
    setLoading(true);
    setInsight('');
    try {
      const entityType = entity.type || entity.label;
      const prompt = `In 2-3 sentences, explain the significance of this specific entity in the document: "${entity.text}" (type: ${entityType}). What role does it play? Any red flags?`;
      const stream = await askGroq({ userMessage: prompt, nerEntities: allEntities, documentText, conversationHistory: [] });
      await streamGroqResponse(stream, (token) => setInsight(prev => prev + token), () => setLoading(false));
    } catch {
      setInsight('Could not load insight.');
      setLoading(false);
    }
  }

  const typeColors = {
    PERSON: '#7F77DD', LOCATION: '#1D9E75', DATE: '#BA7517',
    LAW_SECTION: '#D85A30', MONEY: '#639922', ORGANIZATION: '#378ADD',
    CASE_NUMBER: '#D4537E'
  };

  const entityType = entity?.type || entity?.label;
  const color = typeColors[entityType] || '#e8e8f0';

  return (
    <div style={{
      position: 'fixed', left: position?.x || 200, top: position?.y || 200,
      width: '280px', background: '#1a1a24', border: `1px solid ${typeColors[entityType] || '#3a3a50'}`,
      borderRadius: '12px', padding: '14px 16px', zIndex: 2000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color }}>{entity?.text}</div>
          <div style={{ fontSize: '10px', color: '#8888a0', marginTop: 2 }}>{entityType}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888a0', cursor: 'pointer', fontSize: '16px' }}>×</button>
      </div>
      <div style={{ fontSize: '12px', color: '#c0c0d8', lineHeight: '1.6' }}>
        {loading ? <span style={{ color: '#8888a0' }}>Analyzing...</span> : insight}
      </div>
    </div>
  );
}
