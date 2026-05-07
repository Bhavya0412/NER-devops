import { useState, useRef, useEffect } from 'react';
import { askGroq, streamGroqResponse } from '../services/groqService';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  { label: 'Summarize document', prompt: 'Give me a plain language summary of this document.' },
  { label: 'Flag risks', prompt: 'Are there any legal risks or red flags in this document?' },
  { label: 'List all persons', prompt: 'List all persons mentioned and their role in this document.' },
  { label: 'Key dates', prompt: 'What are the important dates and what happened on each?' },
  { label: 'Which IPC sections?', prompt: 'What IPC or legal sections are cited? How serious are they?' },
  { label: 'Money amounts', prompt: 'What monetary amounts are mentioned and in what context?' }
];

export default function AIChatPanel({ isOpen, onClose, entities, documentText }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `**NER Analysis Complete.**\n\nI have processed ${entities?.length || 0} entities from your document. Ask me anything about it.\n\nTry a quick prompt below to get started.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
        // Reset state when opening a new document context
        setMessages([
          {
            role: 'assistant',
            content: `**NER Analysis Complete.**\n\nI have processed ${entities?.length || 0} entities from your document. Ask me anything about it.\n\nTry a quick prompt below to get started.`
          }
        ]);
        setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, entities]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || isLoading) return;
    setInput('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);
    setIsLoading(true);

    try {
      const stream = await askGroq({
        userMessage: userText,
        nerEntities: entities,
        documentText,
        conversationHistory: history
      });

      await streamGroqResponse(
        stream,
        (token) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + token
            };
            return updated;
          });
        },
        () => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
            return updated;
          });
          setIsLoading(false);
        }
      );
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${err.message}. Backend analysis unreachable.`,
          streaming: false
        };
        return updated;
      });
      setIsLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', right: isOpen ? 0 : '-420px', top: 0, height: '100vh',
      width: '400px', background: '#0f0f13', borderLeft: '1px solid #2a2a35',
      transition: 'right 0.3s ease', zIndex: 1000, display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8f0' }}>Local Analysis Engine</div>
          <div style={{ fontSize: '11px', color: '#8888a0', marginTop: 2 }}>{entities?.length || 0} entities analyzed · On-device Proxy</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8888a0', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '90%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? '#3d3a6e' : '#1a1a24',
              color: '#e8e8f0', fontSize: '13px', lineHeight: '1.6'
            }}>
              <ReactMarkdown>{msg.content || (msg.streaming ? '▋' : '')}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {QUICK_PROMPTS.map((qp, i) => (
            <button key={i} onClick={() => sendMessage(qp.prompt)} style={{
              padding: '5px 10px', borderRadius: '20px', border: '1px solid #3a3a50',
              background: 'transparent', color: '#a0a0c0', fontSize: '11px', cursor: 'pointer'
            }}>{qp.label}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a35', display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about this document..."
          disabled={isLoading}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: '20px', border: '1px solid #3a3a50',
            background: '#1a1a24', color: '#e8e8f0', fontSize: '13px', outline: 'none'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '9px 16px', borderRadius: '20px', background: isLoading ? '#2a2a3a' : '#534AB7',
            color: '#fff', border: 'none', fontSize: '13px', cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >{isLoading ? '...' : 'Send'}</button>
      </div>
    </div>
  );
}
