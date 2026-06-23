import React, { useState } from 'react';
import { UploadCloud, CheckCircle, DownloadCloud } from 'lucide-react';

export default function EditorPanel({ role }) {
  const [content, setContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('DataOps Sync: Active Graph to Git');
  const [versionTag, setVersionTag] = useState('v1.2.0');
  const [isPulling, setIsPulling] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const canCommit = role === 'DataSteward' || role === 'Admin';

  const handlePull = async () => {
    setIsPulling(true);
    try {
      const res = await fetch('http://localhost:3001/api/ontology/export-ttl');
      const text = await res.text();
      setContent(text);
    } catch (err) {
      console.error(err);
      alert('Failed to pull from active graph');
    } finally {
      setIsPulling(false);
    }
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      const res = await fetch('http://localhost:3001/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlContent: content, message: commitMessage, version: versionTag })
      });
      if (res.ok) {
        alert('Successfully committed and tagged!');
      } else {
        alert('Failed to commit');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to commit');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '360px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>VERSION CONTROL</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`glass-button ${canCommit ? 'primary' : ''}`} 
            style={{ flex: 1, justifyContent: 'center', opacity: canCommit ? 1 : 0.5 }}
            disabled={!canCommit || isCommitting}
            onClick={handleCommit}
            title={!canCommit ? "You do not have commit access" : ""}
          >
            <CheckCircle size={14} />
            {isCommitting ? '...' : 'Commit'}
          </button>
          <button 
            className="glass-button" 
            style={{ flex: 1, justifyContent: 'center', opacity: canCommit ? 1 : 0.5 }}
            disabled={!canCommit || isPulling}
            onClick={handlePull}
            title={!canCommit ? "You do not have pull access" : ""}
          >
            <DownloadCloud size={14} />
            {isPulling ? '...' : 'Pull Active'}
          </button>
        </div>
        
        {!canCommit && (
          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--accent-red)' }}>
            Requires Data Steward privileges.
          </div>
        )}
      </div>
      
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
        <input 
          type="text" 
          value={versionTag} 
          onChange={e => setVersionTag(e.target.value)} 
          placeholder="Version (e.g. v1.2.0)"
          style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}
          disabled={!canCommit}
        />
        <input 
          type="text" 
          value={commitMessage} 
          onChange={e => setCommitMessage(e.target.value)} 
          placeholder="Commit Message"
          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}
          disabled={!canCommit}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>app_demo.ttl</h4>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono"
          style={{ 
            flex: 1, 
            background: '#FFFFFF', 
            border: '1px solid var(--border-glass)', 
            borderRadius: '8px', 
            padding: '12px',
            color: 'var(--text-main)',
            fontSize: '0.8rem',
            resize: 'none',
            outline: 'none',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
          }}
          disabled={!canCommit}
        />
      </div>
    </div>
  );
}
