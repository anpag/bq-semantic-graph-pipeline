import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, LineChart, Info } from 'lucide-react';
import InfoModal from './InfoModal';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AiChatDashboard() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Data Assistant. Ask me anything about the formulations, tests, and ontology. I can write BigQuery SQL to answer your questions or search the web if needed.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content })
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply,
          chartData: data.chartData 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error communicating with the AI server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    // Preprocess LaTeX & Markdown math notations into clean presentation-ready unicode/HTML
    let processed = text;
    
    // Celsius conversions
    processed = processed.replace(/\$([0-9.]+)\^\\circ\\text\{C\}\$/g, '$1°C');
    processed = processed.replace(/([0-9.]+)\^\\circ\\text\{C\}/g, '$1°C');
    processed = processed.replace(/\$([0-9.]+)\s*\\\s*circ\\text\{C\}\$/g, '$1°C');
    processed = processed.replace(/\$([0-9.]+)\^\\circ\$/g, '$1°');
    processed = processed.replace(/\\circ\\text\{C\}/g, '°C');
    processed = processed.replace(/\\circ/g, '°');
    processed = processed.replace(/\\text\{C\}/g, 'C');
    
    // Percent signs
    processed = processed.replace(/\\%/g, '%');
    processed = processed.replace(/\$([0-9.,+-]+)%\$/g, '$1%');
    processed = processed.replace(/\$([0-9.,+-]+)\$/g, '$1');
    processed = processed.replace(/([0-9.,+-]+)\\\s*%/g, '$1%');
    
    // Power/Exponent signs
    processed = processed.replace(/\$10\^6\$/g, '10⁶');
    processed = processed.replace(/10\^6/g, '10⁶');
    processed = processed.replace(/\$([0-9]+)\^([0-9a-zA-Z]+)\$/g, '$1<sup>$2</sup>');
    
    // Statistical equations
    processed = processed.replace(/\$R\s*=\s*([0-9.+-]+)\$/g, 'R = $1');
    
    // General cleanup of remaining single dollar signs for clean presentation
    processed = processed.replace(/\$([^\$]+)\$/g, '$1');

    const lines = processed.split('\n');
    const elements = [];
    let currentList = [];

    const flushList = (key) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${key}`} style={{ 
            margin: '6px 0 12px 0', 
            paddingLeft: '20px', 
            listStyleType: 'disc', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}>
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    const parseInlineStyles = (str) => {
      const parts = str.split('**');
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} style={{ fontWeight: 650, color: 'var(--text-main)' }}>{part}</strong>;
        }
        
        // Handle superscript inline
        if (part.includes('<sup>') && part.includes('</sup>')) {
          const subParts = part.split(/(<sup>.*?<\/sup>)/g);
          return subParts.map((subPart, subIdx) => {
            if (subPart.startsWith('<sup>') && subPart.endsWith('</sup>')) {
              const inner = subPart.substring(5, subPart.length - 6);
              return <sup key={subIdx} style={{ fontSize: '0.75em', verticalAlign: 'super' }}>{inner}</sup>;
            }
            return subPart;
          });
        }
        
        return part;
      });
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      
      // Match markdown headers: e.g. ### **Header**
      if (trimmedLine.startsWith('#')) {
        flushList(idx);
        const match = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const rawContent = match[2];
          const content = parseInlineStyles(rawContent);
          
          const headingStyle = {
            margin: level <= 3 ? '16px 0 8px 0' : '12px 0 6px 0',
            fontSize: level === 3 ? '1.1rem' : level === 4 ? '1rem' : '0.92rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            borderBottom: level === 3 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
            paddingBottom: level === 3 ? '4px' : '0',
            display: 'block'
          };
          
          elements.push(<span key={`h-${idx}`} style={headingStyle}>{content}</span>);
        } else {
          elements.push(<p key={`p-${idx}`} style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>{parseInlineStyles(line)}</p>);
        }
      } 
      // Match bullet list items
      else if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
        const match = trimmedLine.match(/^[*+-]\s+(.*)$/);
        const itemContent = match ? match[1] : trimmedLine.substring(1).trim();
        currentList.push(
          <li key={`li-${idx}-${currentList.length}`} style={{ margin: '2px 0', color: 'var(--text-main)', lineHeight: '1.5' }}>
            {parseInlineStyles(itemContent)}
          </li>
        );
      } 
      // Empty lines
      else if (trimmedLine === '') {
        flushList(idx);
        elements.push(<div key={`br-${idx}`} style={{ height: '8px' }} />);
      } 
      // Paragraph lines
      else {
        flushList(idx);
        elements.push(
          <p key={`p-${idx}`} style={{ margin: '0 0 10px 0', color: 'var(--text-main)', lineHeight: '1.5' }}>
            {parseInlineStyles(line)}
          </p>
        );
      }
    });

    flushList('end');
    return elements;
  };

  const renderChart = (chartData) => {
    if (!chartData || !chartData.data || chartData.data.length === 0) return null;
    
    return (
      <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.8)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LineChart size={16} />
          {chartData.title || 'Data Visualization'}
        </h4>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey={chartData.xAxisKey} tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-glass)' }} />
              <Legend />
              {chartData.lines && chartData.lines.map((line, idx) => (
                <Line 
                  key={idx} 
                  type="monotone" 
                  dataKey={line.dataKey} 
                  stroke={line.color || 'var(--accent-blue)'} 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ flex: 1, margin: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bot size={24} color="var(--accent-blue)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>AI Analytics Chat</h2>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '0.85rem',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
        >
          <Info size={16} />
          How does Conversational Analytics work?
        </button>
      </div>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Conversational Analytics Agent">
        <p>This <strong>Agentic System</strong> addresses <strong>Use Case 2</strong> by allowing you to interact with the harmonized data via natural language queries.</p>
        <p>Because the graph is highly structured (thanks to the Vertex AI extraction pipeline), we don't just use standard RAG (Retrieval-Augmented Generation). Instead, we use an advanced <strong>Text-to-SQL</strong> methodology to perform deep statistical and exploratory analysis.</p>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>When you ask a question, the backend prompts Vertex AI (Gemini Flash).</li>
          <li>Gemini acts as an autonomous data analyst, writing a complex SQL query to answer your question.</li>
          <li>The raw SQL results are returned and parsed into both natural language and interactive Recharts.</li>
        </ol>
        <p>This enables complex operations such as <strong>calculating Pearson correlations between variables</strong> and <strong>identifying trends related to raw material usage or test outcomes</strong> with 100% mathematical accuracy and zero hallucination.</p>
      </InfoModal>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            gap: '16px', 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'rgba(0, 113, 227, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={18} color="var(--accent-blue)" />
              </div>
            )}
            
            <div style={{ 
              background: msg.role === 'user' ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.6)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
              padding: '16px',
              borderRadius: '12px',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.role === 'assistant' ? renderMessageText(msg.content) : msg.content}
              {msg.chartData && renderChart(msg.chartData)}
            </div>

            {msg.role === 'user' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'var(--bg-glass-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-glass)' }}>
                <User size={18} color="var(--text-muted)" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: '16px', alignSelf: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'rgba(0, 113, 227, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={18} color="var(--accent-blue)" />
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Loader className="spinner" size={16} /> Thinking and querying BigQuery...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.3)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'rgba(255, 255, 255, 0.9)', 
          borderRadius: '24px', 
          padding: '8px 16px',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about Formulations, Tests, or generate charts..."
            style={{ 
              flex: 1, 
              border: 'none', 
              outline: 'none', 
              background: 'transparent',
              fontSize: '0.95rem',
              resize: 'none',
              padding: '8px 0',
              maxHeight: '120px',
              minHeight: '24px'
            }}
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{ 
              background: input.trim() && !isLoading ? 'var(--accent-blue)' : 'var(--bg-glass-hover)', 
              color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
              border: 'none', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              marginLeft: '12px'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
