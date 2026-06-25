import React, { useState, useEffect } from 'react';
import { Ruler, Database } from 'lucide-react';

export default function MetrologyDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const classMap = {
    'Test': {
      definition: 'A standardized physical or chemical evaluation method applied to a formulation.',
      attributes: ['Standard (ASTM/ISO)', 'Equipment', 'Conditions']
    },
    'Test Outcome': {
      definition: 'The quantitative or qualitative result derived from a specific test.',
      attributes: ['Value', 'Unit (QUDT)', 'Timestamp']
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

        const metrologyNodes = data.nodes.filter(n => 
          ['Test', 'Test Outcome'].includes(n.group)
        );
        
        const aggClasses = Object.keys(classMap)
          .filter(group => metrologyNodes.some(n => n.group === group) || classMap[group])
          .map(group => ({
            name: group,
            ...classMap[group],
            examples: metrologyNodes.filter(n => n.group === group).slice(0, 3).map(n => n.label)
          })).filter(cls => cls.examples.length > 0);
        setClasses(aggClasses);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch metrology data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Ruler size={24} color="var(--accent-orange)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Metrology & Attributes (QUDT)</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
        A tabular view of the generalized measurement concepts, tests, and attributes in the ontology.
      </p>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-muted">Loading Metrology Data...</div>
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
                      background: 'rgba(255, 149, 0, 0.1)', 
                      color: 'var(--accent-orange)', 
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
