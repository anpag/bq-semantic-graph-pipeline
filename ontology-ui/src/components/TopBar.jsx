import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Shield, User, Info, Upload, Loader, Database, Brain, Network, FileText, Layers, Sparkles, ArrowRight } from 'lucide-react';
import InfoModal from './InfoModal';
import architectureImg from '../assets/architecture_premium.jpg';

export default function TopBar({ currentRole, onRoleChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isImgExpanded, setIsImgExpanded] = useState(false);
  const [isImgHovered, setIsImgHovered] = useState(false);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadStatus('Initializing...');
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        
        const response = await fetch('http://localhost:3001/api/ingest', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop(); 
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.status && parsed.status.length < 150 && !parsed.status.trim().startsWith('"')) {
                  // Strip ANSI escape codes and clean up Dataform logs for the UI
                  const cleanStatus = parsed.status.replace(/\x1b\[[0-9;]*m/g, '').replace('[Dataform]', 'Dataform:').trim();
                  setUploadStatus(cleanStatus);
                }
                if (parsed.error || parsed.success === false) {
                  console.error("Stream payload error:", parsed);
                }
              } catch (e) {}
            }
          }
        }
      }
      setUploadStatus('Finished!');
      alert('Upload & Extraction Complete! Please refresh the page to view the latest graph.');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      event.target.value = null;
    }
  };

  return (
    <header className="glass-header" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <Shield size={16} color="var(--accent-blue)" />
        Acme Semantic Knowledge Graph
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isUploading ? '#8e8e93' : 'var(--accent-blue)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              color: 'white',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              fontWeight: 500
            }}
            onMouseOver={e => !isUploading && (e.currentTarget.style.background = '#005bb5')}
            onMouseOut={e => !isUploading && (e.currentTarget.style.background = 'var(--accent-blue)')}
          >
            {isUploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
            {isUploading ? 'Uploading...' : 'Upload Data'}
            <input 
              type="file" 
              multiple 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
              disabled={isUploading}
              accept=".pdf,.xlsx,.csv,.xls"
            />
          </label>
          
          {isUploading && uploadStatus && (
            <span style={{ 
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, 
              fontSize: '0.75rem', color: 'var(--text-main)', 
              maxWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
              background: 'rgba(255,255,255,0.95)', padding: '6px 10px', 
              borderRadius: '4px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-glass)',
              zIndex: 100, display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Loader size={12} className="animate-spin" style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              {uploadStatus}
            </span>
          )}
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.8rem',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
        >
          <Info size={14} />
          How does this work?
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-glass)' }}></div>

        <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <User size={14} />
          Simulate Role:
        </span>
        <select 
          value={currentRole} 
          onChange={(e) => onRoleChange(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.8rem',
            color: 'var(--text-main)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="Analyst">Analyst (View Only)</option>
          <option value="DataSteward">Data Steward (Commit Access)</option>
          <option value="Admin">Admin (Full Access)</option>
        </select>
      </div>

      <InfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="var(--accent-blue)" />
            <span style={{ fontWeight: 700 }}>How the Semantic Knowledge Graph Works</span>
          </div>
        }
        size="xlarge"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '32px',
          marginTop: '8px',
          alignItems: 'start'
        }}>
          {/* Left Column: Premium Diagram Frame */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div 
              onClick={() => setIsImgExpanded(true)}
              onMouseEnter={() => setIsImgHovered(true)}
              onMouseLeave={() => setIsImgHovered(false)}
              style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                borderRadius: '8px', 
                border: '1px solid rgba(0,0,0,0.08)',
                cursor: 'zoom-in'
              }}
            >
              <img 
                src={architectureImg} 
                alt="Architecture Diagram" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  display: 'block',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  transform: isImgHovered ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isImgHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                backdropFilter: 'blur(2px)'
              }}>
                🔍 CLICK TO EXPAND
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Walkthrough Deck */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-blue)', fontWeight: 700, margin: '0 0 4px 0' }}>
                End-To-End Enterprise Flow
              </p>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Innovation Data Foundation</h3>
              <p style={{ color: '#48484a', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.5' }}>
                An automated, high-assurance pipeline unifying unstructured files with standard schemas via LLMs and BigQuery Property Graphs.
              </p>
            </div>

            {/* Stepper Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Step 1 */}
              <div style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(0, 113, 227, 0.08)',
                  color: 'var(--accent-blue)',
                  flexShrink: 0
                }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    1. Data Curation & Ingestion
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#48484a', margin: 0, lineHeight: '1.4' }}>
                    Raw R&D files (e.g. spreadsheet templates, LIMS data exports, or raw formulation PDFs) are ingested and staged in high-availability Cloud Storage buckets, cataloging all digital assets.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(52, 199, 89, 0.08)',
                  color: 'var(--accent-green)',
                  flexShrink: 0
                }}>
                  <Brain size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    2. Cognitive LLM Extraction (Gemini)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#48484a', margin: 0, lineHeight: '1.4' }}>
                    Multi-modal parallel extractors leverage <strong>Gemini 3.1 Pro</strong> to execute rigid semantic mapping, structured Chain-of-Thought parsing, and translation to align concepts against canonical ontologies like Allotrope (AFO) and Chemical Methods (CHMO).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 149, 0, 0.08)',
                  color: 'var(--accent-orange)',
                  flexShrink: 0
                }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    3. Staging & Dataform Assertions
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#48484a', margin: 0, lineHeight: '1.4' }}>
                    Extracted triples populate BQ staging tables. <strong>Dataform</strong> acts as our continuous integration layer, compiling SQL workflows and running referential integrity rules to certify domain-range validity.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(0, 122, 255, 0.08)',
                  color: 'var(--accent-blue)',
                  flexShrink: 0
                }}>
                  <Network size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    4. BigQuery Property Graph & Real-Time Analytics
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#48484a', margin: 0, lineHeight: '1.4' }}>
                    Certified triples are compiled using ISO GQL into native BigQuery node/edge structures. This React/Vite front-end retrieves dynamically traversed paths, empowering real-time, interactive exploration.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </InfoModal>

      {isImgExpanded && ReactDOM.createPortal(
        <div 
          onClick={() => setIsImgExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000005,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 300,
            fontFamily: 'sans-serif',
            cursor: 'pointer',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            ✕
          </div>
          <img 
            src={architectureImg} 
            alt="Expanded Architecture Diagram" 
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              transform: 'scale(1)',
              animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          />
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>,
        document.body
      )}
    </header>
  );
}
