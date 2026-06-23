import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export default function InfoModal({ isOpen, onClose, title, children, size }) {
  if (!isOpen) return null;

  const modalContent = (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999, /* extremely high to escape all stacking contexts */
        padding: '20px'
      }}>
      <div className="glass-panel" style={{
        maxWidth: size === 'xlarge' ? '1200px' : size === 'large' ? '1000px' : '800px',
        width: '95%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: '32px'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px', right: '20px',
            background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {title}
        </h2>
        
        <div style={{ lineHeight: '1.6', fontSize: '0.95rem', overflowY: 'auto', paddingRight: '10px', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
