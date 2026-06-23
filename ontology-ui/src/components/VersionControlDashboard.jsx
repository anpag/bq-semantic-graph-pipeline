import React, { useState, useEffect } from 'react';
import { History, GitCommit, Bot, FileText, CheckCircle2 } from 'lucide-react';
import * as Diff from 'diff';

export default function VersionControlDashboard() {
  const [baseVersion, setBaseVersion] = useState('');
  const [compareVersion, setCompareVersion] = useState('');
  const [versions, setVersions] = useState([]);
  
  const [baseContent, setBaseContent] = useState('');
  const [compareContent, setCompareContent] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Fetch Git Tags on Mount
  useEffect(() => {
    fetch('http://localhost:3001/api/git/tags')
      .then(res => res.json())
      .then(tags => {
        setVersions(tags);
        if (tags.length >= 2) {
          setCompareVersion(tags[0]);
          setBaseVersion(tags[1]);
        }
      })
      .catch(err => console.error('Failed to fetch tags:', err));
  }, []);

  // Fetch File Contents when versions change
  useEffect(() => {
    if (baseVersion) {
      fetch(`http://localhost:3001/api/git/file?version=${baseVersion}`)
        .then(res => res.json())
        .then(data => setBaseContent(data.content || ''))
        .catch(err => console.error(err));
    }
    if (compareVersion) {
      fetch(`http://localhost:3001/api/git/file?version=${compareVersion}`)
        .then(res => res.json())
        .then(data => setCompareContent(data.content || ''))
        .catch(err => console.error(err));
    }
  }, [baseVersion, compareVersion]);

  // Compute Diffs
  const [leftLines, setLeftLines] = useState([]);
  const [rightLines, setRightLines] = useState([]);
  const [aiSummary, setAiSummary] = useState({ 
    text: 'Select versions to compare.', 
    safe: true,
    iconColor: 'var(--accent-blue)',
    bgColor: 'rgba(10, 132, 255, 0.05)',
    borderColor: 'rgba(10, 132, 255, 0.2)',
    iconBg: 'rgba(10, 132, 255, 0.1)'
  });

  useEffect(() => {
    if (baseContent || compareContent) {
      const diffResult = Diff.diffLines(baseContent, compareContent);
      let left = [];
      let right = [];
      let tempRemoved = [];
      let tempAdded = [];

      const flush = () => {
        const max = Math.max(tempRemoved.length, tempAdded.length);
        for (let i = 0; i < max; i++) {
          left.push(tempRemoved[i] || { type: 'empty', value: ' ' });
          right.push(tempAdded[i] || { type: 'empty', value: ' ' });
        }
        tempRemoved = [];
        tempAdded = [];
      };

      let addedLinesCount = 0;
      let removedLinesCount = 0;
      let hasBPARemoved = false;
      let hasTHFAdded = false;

      diffResult.forEach(part => {
        // Strip out carriage returns that cause text overlapping in HTML
        const safeValue = part.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const strippedValue = safeValue.endsWith('\n') ? safeValue.slice(0, -1) : safeValue;
        const lines = strippedValue.split('\n');
        
        if (part.added) {
          tempAdded.push(...lines.map(l => ({ type: 'added', value: l })));
          addedLinesCount += lines.length;
          if (safeValue.includes('Tetrahydrofuran') || safeValue.includes('THF')) hasTHFAdded = true;
        } else if (part.removed) {
          tempRemoved.push(...lines.map(l => ({ type: 'removed', value: l })));
          removedLinesCount += lines.length;
          if (safeValue.includes('BisphenolA') || safeValue.includes('BPA')) hasBPARemoved = true;
        } else {
          flush();
          lines.forEach(line => {
            left.push({ type: 'unchanged', value: line });
            right.push({ type: 'unchanged', value: line });
          });
        }
      });
      flush();

      setLeftLines(left);
      setRightLines(right);

      // Generate Agentic Summary
      if (addedLinesCount === 0 && removedLinesCount === 0) {
        setAiSummary({
          text: 'No semantic changes detected between these two versions. The ontologies are identical.',
          safe: true,
          iconColor: 'var(--accent-blue)',
          bgColor: 'rgba(10, 132, 255, 0.05)',
          borderColor: 'rgba(10, 132, 255, 0.2)',
          iconBg: 'rgba(10, 132, 255, 0.1)'
        });
      } else {
        // Fetch Real AI Summary
        setAiSummary({
          text: 'Analyzing semantic changes with Gemini 3.5 Flash...',
          safe: true,
          iconColor: 'var(--accent-blue)',
          bgColor: 'rgba(10, 132, 255, 0.05)',
          borderColor: 'rgba(10, 132, 255, 0.2)',
          iconBg: 'rgba(10, 132, 255, 0.1)'
        });

        fetch('http://localhost:3001/api/git/diff-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseContent, compareContent })
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setAiSummary({
            text: data.summary,
            safe: data.safe,
            iconColor: data.safe ? 'var(--accent-green)' : '#f59e0b',
            bgColor: data.safe ? 'rgba(52, 199, 89, 0.05)' : 'rgba(245, 158, 11, 0.05)',
            borderColor: data.safe ? 'rgba(52, 199, 89, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            iconBg: data.safe ? 'rgba(52, 199, 89, 0.1)' : 'rgba(245, 158, 11, 0.1)'
          });
        })
        .catch(err => {
          console.error(err);
          setAiSummary({
            text: 'Error generating AI summary. Fallback: General updates detected. Please verify manually.',
            safe: false,
            iconColor: '#f87171',
            bgColor: 'rgba(248, 113, 113, 0.05)',
            borderColor: 'rgba(248, 113, 113, 0.2)',
            iconBg: 'rgba(248, 113, 113, 0.1)'
          });
        });
      }
    }
  }, [baseContent, compareContent]);

  const renderLine = (lineObj, i) => {
    let bg = 'transparent';
    let color = '#cccccc';
    if (lineObj.type === 'added') {
      bg = 'rgba(74, 222, 128, 0.2)';
      color = '#4ade80';
    } else if (lineObj.type === 'removed') {
      bg = 'rgba(248, 113, 113, 0.2)';
      color = '#f87171';
    } else if (lineObj.type === 'empty') {
      bg = 'rgba(255, 255, 255, 0.02)';
    }

    return (
      <div key={i} style={{ backgroundColor: bg, color, padding: '0 8px', borderRadius: '4px', whiteSpace: 'pre', height: '1.6em' }}>
        {lineObj.value || ' '}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <History size={24} color="var(--accent-blue)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Ontology Version Control</h2>
        </div>
        
        {/* Version Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.5)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Base:</span>
            <select 
              value={baseVersion} 
              onChange={e => setBaseVersion(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
            >
              {versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          
          <GitCommit size={16} color="var(--text-muted)" />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compare:</span>
            <select 
              value={compareVersion} 
              onChange={e => setCompareVersion(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', color: 'var(--accent-blue)' }}
            >
              {versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* AI Summary Block */}
      <div style={{ background: aiSummary.bgColor, border: `1px solid ${aiSummary.borderColor}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', transition: 'all 0.3s ease' }}>
        <div style={{ padding: '8px', background: aiSummary.iconBg, borderRadius: '8px', height: 'fit-content', transition: 'all 0.3s ease' }}>
          <Bot size={20} color={aiSummary.iconColor} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>AI Semantic Diff Summary</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {aiSummary.text}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: aiSummary.iconColor, fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.3s ease' }}>
              <CheckCircle2 size={12} /> {aiSummary.safe ? 'Safe to merge' : 'Manual review recommended'}
            </div>
          </div>
        </div>
      </div>

      {/* Git Diff Viewer (Side-by-Side) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e', borderRadius: '12px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: '#252526', borderBottom: '1px solid #333' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRight: '1px solid #333' }}>
            <FileText size={14} color="#858585" />
            <span style={{ fontSize: '0.8rem', color: '#cccccc', fontFamily: 'var(--font-mono)' }}>ontology_definitions.ttl (Base)</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px' }}>
            <FileText size={14} color="#858585" />
            <span style={{ fontSize: '0.8rem', color: '#cccccc', fontFamily: 'var(--font-mono)' }}>ontology_definitions.ttl (Compare)</span>
          </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
          {/* Base Pane */}
          <div style={{ flex: 1, padding: '16px', borderRight: '1px solid #333', overflowX: 'auto' }}>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {leftLines.map((lineObj, i) => renderLine(lineObj, i))}
            </pre>
          </div>
          
          {/* Compare Pane */}
          <div style={{ flex: 1, padding: '16px', overflowX: 'auto' }}>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {rightLines.map((lineObj, i) => renderLine(lineObj, i))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
