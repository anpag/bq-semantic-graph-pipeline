import React, { useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from './layoutUtils';
import { 
  Info, Network, Ruler, Settings, Code, FileText, CheckCircle2, 
  Upload, Loader, GitPullRequest, ArrowRight, ShieldCheck, Database
} from 'lucide-react';
import InfoModal from './InfoModal';

const colorMap = {
  'Project': '#007aff',
  'Experiment': '#34c759',
  'Formulation': '#ff9500',
  'Ingredient': '#af52de',
  'Test': '#ff3b30',
  'Test Outcome': '#ff2d55',
  'inferred': '#8e8e93',
  'unknown': '#8e8e93'
};

export default function GraphView({ data, onRefresh }) {
  // Graph visualization states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Guided Ontology Wizard states
  const [wizardStep, setWizardStep] = useState('create'); // 'create', 'loading', 'review', 'materializing'
  const [selectedFile, setSelectedFile] = useState(null);
  const [standards, setStandards] = useState({ AFO: true, CHMO: true, QUDT: true });
  const [version, setVersion] = useState('v1.0.0-draft');
  const [commitMsg, setCommitMessage] = useState('Initialize Guided Ontology from reference file');
  const [loadingStatus, setLoadingStatus] = useState('');
  
  // Generated draft schema container
  const [draftResult, setDraftResult] = useState(null);
  const [approveVersion, setApproveVersion] = useState('v1.0.0');
  const [approveMsg, setApproveMsg] = useState('Baseline Enterprise Adhesive R&D Ontology Release v1.0.0');

  // ReactFlow Elements compilation
  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const rfNodes = data.nodes.map((node) => ({
      id: node.id,
      data: { label: node.label },
      position: { x: 0, y: 0 },
      style: {
        width: 200,
        minHeight: 50,
        background: 'rgba(255,255,255,0.9)',
        border: `2px solid ${colorMap[node.group] || colorMap['unknown']}`,
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'var(--text-main)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
        wordWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }));

    const rfEdges = data.links.map((link, idx) => ({
      id: `e${idx}-${link.source.id || link.source}-${link.target.id || link.target}`,
      source: link.source.id || link.source,
      target: link.target.id || link.target,
      label: link.label || '',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#a1a1aa', strokeWidth: 2 },
      labelStyle: { fill: '#71717a', fontWeight: 600 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#a1a1aa',
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rfNodes,
      rfEdges,
      'TB' // Top-to-Bottom
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [data, setNodes, setEdges]);

  // Handle Draft Ontology Generation (Calling Backend)
  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a reference spreadsheet or document to guide the ontology builder.');
      return;
    }

    setWizardStep('loading');
    setLoadingStatus('Uploading reference file...');

    const selectedStandards = Object.keys(standards).filter(k => standards[k]).join(',');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('standards', selectedStandards);
      formData.append('version', version);
      formData.append('message', commitMsg);

      setTimeout(() => setLoadingStatus('Parsing file layout & columns...'), 1500);
      setTimeout(() => setLoadingStatus('Invoking Gemini 3.5 Flash Cognitive Reasoner...'), 3500);
      setTimeout(() => setLoadingStatus('Aligning class structures with AFO/CHMO taxonomies...'), 6000);
      setTimeout(() => setLoadingStatus('Mapping metrology measurements with QUDT standards...'), 8500);
      setTimeout(() => setLoadingStatus('Serializing W3C RDF Turtle (.ttl) code...'), 11000);
      setTimeout(() => setLoadingStatus('Registering draft version in Git & staging tables...'), 13500);

      const response = await fetch('http://localhost:3001/api/ontology/create-draft', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate draft.');
      }

      setDraftResult(result);
      setWizardStep('review');
    } catch (err) {
      console.error('Failed to create ontology draft:', err);
      alert('Failed to generate ontology draft: ' + err.message);
      setWizardStep('create');
    }
  };

  // Handle Draft Approval & BigQuery Materialization (Calling Backend)
  const handleApproveDraft = async (e) => {
    e.preventDefault();
    setWizardStep('materializing');
    setLoadingStatus('Applying final version tag in Git...');

    try {
      setTimeout(() => setLoadingStatus('Compiling Dataform pipeline DAG models...'), 1500);
      setTimeout(() => setLoadingStatus('Asserting structural referential integrity on staging schema...'), 3000);
      setTimeout(() => setLoadingStatus('Materializing node classes & relation rules in production BigQuery...'), 5000);
      setTimeout(() => setLoadingStatus('Compiling modern SQL Property Graph model...'), 7500);

      const response = await fetch('http://localhost:3001/api/ontology/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: approveVersion,
          message: approveMsg
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to materialize ontology.');
      }

      alert('Success! Ontology approved, logged in Git, and materialized in BigQuery.');
      if (onRefresh) onRefresh();
      setWizardStep('create'); // Reset step for next time
    } catch (err) {
      console.error('Failed to materialize ontology:', err);
      alert('Failed to approve and materialize ontology: ' + err.message);
      setWizardStep('review');
    }
  };

  const handleStandardToggle = (key) => {
    setStandards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Render ONBOARDING STATE if no ontology nodes exist
  if (!data || !data.nodes || data.nodes.length === 0) {
    if (wizardStep === 'create') {
      return (
        <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
            <Network size={32} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Guided Ontology Builder</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Construct a standards-compliant semantic ontology schema from a reference lab spreadsheet.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateDraft} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
            {/* Reference file upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>1. Reference Lab Document</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Upload a sample spreadsheet (e.g. <code>FlyHigh.xlsx</code>) containing columns and metrics. Gemini will analyze its schema.
              </span>
              <label style={{
                border: '2px dashed var(--border-glass)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.2)', transition: 'background 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}>
                <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to select reference file (.xlsx, .pdf, .csv)'}
                </span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.pdf,.csv" 
                  onChange={e => setSelectedFile(e.target.files[0])} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            {/* Ontological Standards checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>2. Aligned Ontological Assets</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Leverage industry-standard vocabularies to automatically seed classes, relationships, and taxonomies.
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <div 
                  onClick={() => handleStandardToggle('AFO')}
                  style={{
                    background: standards.AFO ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.4)',
                    border: standards.AFO ? '1px solid var(--accent-blue)' : '1px solid var(--border-glass)',
                    padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: standards.AFO ? 'var(--accent-blue)' : 'var(--text-main)' }}>AFO Integration</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Allotrope Foundation Ontology for chemistry recipes, formulations, and ingredients.</span>
                </div>
                
                <div 
                  onClick={() => handleStandardToggle('CHMO')}
                  style={{
                    background: standards.CHMO ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.4)',
                    border: standards.CHMO ? '1px solid var(--accent-blue)' : '1px solid var(--border-glass)',
                    padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: standards.CHMO ? 'var(--accent-blue)' : 'var(--text-main)' }}>CHMO Alignment</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Chemical Methods Ontology for laboratory assays, analytical test methods, and equipment.</span>
                </div>

                <div 
                  onClick={() => handleStandardToggle('QUDT')}
                  style={{
                    background: standards.QUDT ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.4)',
                    border: standards.QUDT ? '1px solid var(--accent-blue)' : '1px solid var(--border-glass)',
                    padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: standards.QUDT ? 'var(--accent-blue)' : 'var(--text-main)' }}>QUDT Metrology</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Quantities, Units, Dimensions and Types for clean unit standardization.</span>
                </div>
              </div>
            </div>

            {/* Version Control parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitPullRequest size={16} /> Git Version Control Settings
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Draft Release Version:</label>
                  <input 
                    type="text" 
                    value={version} 
                    onChange={e => setVersion(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', outline: 'none', background: 'rgba(255,255,255,0.8)' }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Draft Commit Message:</label>
                  <input 
                    type="text" 
                    value={commitMsg} 
                    onChange={e => setCommitMessage(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', outline: 'none', background: 'rgba(255,255,255,0.8)' }} 
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-start',
                background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', marginTop: '12px'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#005bb5'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--accent-blue)'}
            >
              Generate Draft Ontology
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      );
    }

    if (wizardStep === 'loading' || wizardStep === 'materializing') {
      return (
        <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Loader size={36} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Guided Ontology Pipeline Running</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px' }}>
            {loadingStatus}
          </p>
        </div>
      );
    }

    if (wizardStep === 'review' && draftResult) {
      return (
        <div className="glass-panel" style={{ flex: 1, margin: '20px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--accent-green)' }} />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Examine Discovered Ontology Draft</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                Your generated schema has been successfully cataloged in Git under draft version <code>{draftResult.version}</code>. Please review before materializing.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flex: 1, minHeight: '400px' }}>
            {/* Discovered schema visual list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
                <Database size={16} color="var(--accent-blue)" />
                Inferred Classes ({draftResult.node_classes?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {draftResult.node_classes?.map((cls, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{cls.class_name}</span>
                      <code style={{ fontSize: '0.75rem', background: 'rgba(0,113,227,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>{cls.uri}</code>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>{cls.definition}</p>
                    {cls.synonyms && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Synonyms:</strong> {cls.synonyms}
                      </span>
                    )}
                    {cls.example && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Example Value:</strong> <code>{cls.example}</code>
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', marginTop: '12px' }}>
                <Network size={16} color="var(--accent-blue)" />
                Discovered Edge Rules ({draftResult.edge_rules?.length || 0})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {draftResult.edge_rules?.map((rule, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Source: {rule.domain_class}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-blue)' }}>─── {rule.relationship_type} ───▶</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Target: {rule.range_class}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Turtle source code pane */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1e1e1e', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <Code size={16} color="#4ade80" />
                <span style={{ color: '#cccccc', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>app_demo.ttl (RDF/Turtle Draft)</span>
              </div>
              <pre style={{ flex: 1, margin: 0, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#4ade80', lineHeight: '1.5' }}>
                {draftResult.turtle_content}
              </pre>
            </div>
          </div>

          {/* Action Approval Bar */}
          <div style={{ background: 'rgba(52, 199, 89, 0.05)', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={22} color="var(--accent-green)" style={{ marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Accept & Materialize Ontology</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                  Accepting this draft will compile your models using Dataform and materialize the classes/relations inside BigQuery, creating an empty operational graph skeleton.
                </p>
              </div>
            </div>

            <form onSubmit={handleApproveDraft} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Production Version Tag:</label>
                <input 
                  type="text" 
                  value={approveVersion} 
                  onChange={e => setApproveVersion(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', outline: 'none', background: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Production Release Message:</label>
                <input 
                  type="text" 
                  value={approveMsg} 
                  onChange={e => setApproveMsg(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', outline: 'none', background: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }} 
                />
              </div>
              <button 
                type="submit"
                style={{
                  background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', height: 'fit-content'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2bb34b'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--accent-green)'}
              >
                Approve & Materialize
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  // Render GRAPH VIEW once nodes are present
  return (
    <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-base)', padding: 0 }}>
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)',
          border: '1px solid var(--border-glass)', borderRadius: '4px',
          padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <Info size={16} color="var(--accent-blue)" />
        How does this Ontology work?
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        attributionPosition="bottom-right"
      >
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap nodeStrokeColor={(n) => n.style?.borderColor || '#000'} nodeColor="#fff" nodeBorderRadius={8} />
      </ReactFlow>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ontology Creation & Integration">
        <p>This <strong>Ontology Explorer</strong> allows you to manage the strict, permitted "rules" of our semantic network, acting as the schema for BigQuery.</p>
        <p>Using <strong>Vertex AI</strong>, we infer and develop a domain-specific ontology by scanning unstructured documents. We then integrate it into a broader enterprise-level ontology framework like the Allotrope Foundation Ontology (AFO) and the Chemical Methods Ontology (CHMO).</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li><strong>Nodes</strong> represent the allowed Classes (e.g., Formulation, TestMethod, Ingredient).</li>
          <li><strong>Edges</strong> represent the strict identification of relationships between attributes.</li>
        </ul>
        <p>This ontology is dynamic: it can be <strong>automatically updated from incoming datasets</strong> as Vertex AI discovers new patterns, or it can be <strong>manually extended or refined</strong> by Data Stewards to accommodate slight structural or semantic variations across different SBU datasets.</p>
      </InfoModal>
    </div>
  );
}
