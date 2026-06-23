import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Loader, Info } from 'lucide-react';
import InfoModal from './InfoModal';

export default function DlqDashboard() {
  const [dlqErrors, setDlqErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingError, setResolvingError] = useState(null);
  const [resolutionTargetClass, setResolutionTargetClass] = useState('');
  const [resolutionRelationship, setResolutionRelationship] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/dlq')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setDlqErrors(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch DLQ data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Dead Letter Queue (Semantic Failures)</h2>
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
          How does the DLQ work?
        </button>
      </div>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Collaboration, Validation & Error Handling">
        <p>The <strong>Dead Letter Queue (DLQ)</strong> provides mechanisms for managing concurrent contributions from multiple users while maintaining strict data governance.</p>
        <p>When Vertex AI extracts tacit knowledge or unstructured insights that <em>do not fit</em> into our strict Ontology (Schema), it flags those facts into a "Semantic Failure" table rather than polluting the graph.</p>
        <h4 style={{ marginTop: '16px', marginBottom: '8px', color: 'var(--text-main)' }}>Validation Workflows & Error Prevention Strategies:</h4>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>BigQuery Dataform automatically runs assertions against new extractions to detect and correct inconsistencies and errors.</li>
          <li>If an extraction contains "unbound knowledge", the pipeline halts those specific rows.</li>
          <li>Data Stewards use this UI to manually review the unbound knowledge via structured change suggestions.</li>
          <li>The Steward can validate the unstructured insight and map it into the Ontology by creating a new formal relationship.</li>
          <li>Once resolved, the backend triggers BigQuery Dataform to rebuild the canonical graph views instantly.</li>
        </ol>
      </InfoModal>

      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
        The CI/CD dataform pipeline has halted production integration. The following ontology relationship rules reference classes that do not exist in the defined terminology.
      </p>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader className="spinner" size={32} color="var(--text-muted)" />
          <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Querying Dataform Assertions...</span>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--accent-red)', padding: '16px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '8px' }}>
          Error fetching DLQ data: {error}
        </div>
      ) : dlqErrors.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
          No semantic failures found. The ontology is clean!
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>CATEGORY</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>ISSUE</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>UNBOUND INSIGHT</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {dlqErrors.map((err, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-glass-hover)' } }}>
                  <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {err.domain_class || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '0.85rem' }}>Unrecognized Concept</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {err.range_class || <span style={{ color: 'var(--accent-red)' }}>Missing</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button 
                      onClick={() => setResolvingError(err)}
                      style={{ 
                      background: 'rgba(0, 113, 227, 0.1)', 
                      color: 'var(--accent-blue)', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Resolve <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolvingError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '450px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Resolve Unbound Knowledge</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              The following insight could not be mapped to the strict ontology: <br/>
              <strong style={{ color: 'var(--accent-red)' }}>"{resolvingError.range_class}"</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Please define the new ontology rules to accommodate this concept.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Target Entity Class (e.g. Formulation)</label>
              <input 
                type="text" 
                placeholder="e.g., Formulation"
                value={resolutionTargetClass}
                onChange={e => setResolutionTargetClass(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>New Relationship Type</label>
              <input 
                type="text" 
                placeholder="e.g., has_observation"
                value={resolutionRelationship}
                onChange={e => setResolutionRelationship(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => {
                  setResolvingError(null);
                  setResolutionTargetClass('');
                  setResolutionRelationship('');
                }}
                disabled={isResolving}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsResolving(true);
                  try {
                    const response = await fetch('http://localhost:3001/api/dlq/resolve', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        insight: resolvingError.range_class,
                        category: resolvingError.domain_class,
                        targetClass: resolutionTargetClass,
                        relationshipType: resolutionRelationship
                      })
                    });
                    if (response.ok) {
                      setDlqErrors(prev => prev.filter(e => e !== resolvingError));
                      setResolvingError(null);
                      setResolutionTargetClass('');
                      setResolutionRelationship('');
                    } else {
                      alert('Failed to resolve error');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Network error');
                  } finally {
                    setIsResolving(false);
                  }
                }}
                disabled={isResolving || !resolutionTargetClass || !resolutionRelationship}
                style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px', cursor: (isResolving || !resolutionTargetClass || !resolutionRelationship) ? 'not-allowed' : 'pointer', opacity: (isResolving || !resolutionTargetClass || !resolutionRelationship) ? 0.7 : 1 }}
              >
                {isResolving ? 'Applying...' : 'Apply Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
