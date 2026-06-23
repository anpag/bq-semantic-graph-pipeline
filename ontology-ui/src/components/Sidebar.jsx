import React from 'react';
import { Network, Ruler, Inbox, History, Share2, FileSpreadsheet } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const ontologyTabs = [
    { id: 'graph', label: 'Ontology Explorer', icon: Network },
    { id: 'taxonomy', label: 'Taxonomy Data', icon: Network },
    { id: 'metrology', label: 'Metrology Data', icon: Ruler },
    { id: 'dlq', label: 'Dead Letter Queue', icon: Inbox },
    { id: 'history', label: 'Version Control', icon: History },
  ];

  const kgTabs = [
    { id: 'kg-explorer', label: 'Graph Explorer', icon: Share2 },
    { id: 'ai-chat', label: 'AI Analytics Chat', icon: Share2 } // Added chat tab
  ];

  const renderTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: isActive ? 'rgba(0, 113, 227, 0.1)' : 'transparent',
          color: isActive ? 'var(--accent-blue)' : 'var(--text-main)',
          fontWeight: isActive ? 500 : 400,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s',
          fontSize: '0.9rem'
        }}
      >
        <Icon size={18} />
        {tab.label}
      </button>
    );
  };

  return (
    <aside className="glass-panel" style={{ width: '240px', display: 'flex', flexDirection: 'column', padding: '16px 0', gap: '24px' }}>
      
      <div>
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border-glass)', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ONTOLOGY MANAGER</h2>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
          {ontologyTabs.map(renderTab)}
        </nav>
      </div>

      <div>
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border-glass)', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>KNOWLEDGE GRAPH</h2>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
          {kgTabs.map(renderTab)}
        </nav>
      </div>

    </aside>
  );
}
