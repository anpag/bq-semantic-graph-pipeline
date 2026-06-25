import React, { useState, useEffect } from 'react';
import { Network, Database } from 'lucide-react';

export default function TaxonomyDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const classMap = {
    'Project': {
      definition: 'A strategic R&D initiative or business objective grouping related experiments.',
      attributes: ['Objective', 'Start Date', 'Status']
    },
    'Experiment': {
      definition: 'A specific scientific study or trial conducted under controlled conditions.',
      attributes: ['Researcher', 'Timestamp', 'Hypothesis']
    },
    'Formulation': {
      definition: 'A specific mixture or recipe of chemical ingredients.',
      attributes: ['Viscosity', 'pH', 'Solid Content']
    },
    'Ingredient': {
      definition: 'A distinct chemical substance or raw material used in a formulation.',
      attributes: ['CAS Number', 'Supplier', 'Purity']
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/graph')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.nodes || data.nodes.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const taxonomyNodes = data.nodes.filter(n => 
          ['Project', 'Experiment', 'Formulation', 'Ingredient'].includes(n.group)
        );
        
        const aggClasses = Object.keys(classMap)
          .filter(group => taxonomyNodes.some(n => n.group === group) || classMap[group])
          .map(group => ({
            name: group,
            ...classMap[group],
            examples: taxonomyNodes.filter(n => n.group === group).slice(0, 3).map(n => n.label)
          })).filter(cls => cls.examples.length > 0);
        setClasses(aggClasses);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch taxonomy data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Network size={24} color="var(--accent-blue)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Core Taxonomy (R&D Structure)</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
        A tabular view of the generalized organizational and chemical entities in the ontology.
      </p>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-muted">Loading Taxonomy Data...</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', width: '15%' }}>ONTOLOGY CLASS</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', width: '35%' }}>DEFINITION</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', width: '20%' }}>KEY ATTRIBUTES</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', width: '30%' }}>EXAMPLES (RAW DATA)</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-glass-hover)' } }}>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      background: 'rgba(0, 113, 227, 0.1)', 
                      color: 'var(--accent-blue)', 
                      padding: '6px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {cls.name}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {cls.definition}
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {cls.attributes.join(', ')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cls.examples.map((ex, i) => (
                        <div key={i} style={{ 
                          fontSize: '0.8rem', 
                          background: 'rgba(255, 255, 255, 0.5)', 
                          border: '1px solid var(--border-glass)', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          color: 'var(--text-main)'
                        }}>
                          {ex}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
