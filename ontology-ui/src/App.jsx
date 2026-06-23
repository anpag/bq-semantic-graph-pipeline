import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import KgExplorer from './components/KgExplorer';
import EditorPanel from './components/EditorPanel';

import DlqDashboard from './components/DlqDashboard';
import TaxonomyDashboard from './components/TaxonomyDashboard';
import MetrologyDashboard from './components/MetrologyDashboard';
import VersionControlDashboard from './components/VersionControlDashboard';
import AiChatDashboard from './components/AiChatDashboard';
function App() {
  const [currentRole, setCurrentRole] = useState('DataSteward');
  const [activeTab, setActiveTab] = useState('graph');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [ontologyData, setOntologyData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  const fetchGraphs = () => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:3001/api/graph').then(res => res.json()),
      fetch('http://localhost:3001/api/ontology/graph').then(res => res.json())
    ])
    .then(([graph, ontology]) => {
      setGraphData(graph);
      setOntologyData(ontology);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch graph data:', err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchGraphs();
  }, []);

  return (
    <div className="app-container">
      <TopBar currentRole={currentRole} onRoleChange={setCurrentRole} />
      
      <main className="main-content">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'graph' ? (
          loading ? (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="text-muted">Loading massive semantic graph from BigQuery...</div>
            </div>
          ) : (
            <GraphView data={ontologyData} onRefresh={fetchGraphs} />
          )
        ) : activeTab === 'taxonomy' ? (
          <TaxonomyDashboard />
        ) : activeTab === 'metrology' ? (
          <MetrologyDashboard />
        ) : activeTab === 'dlq' ? (
          <DlqDashboard />
        ) : activeTab === 'kg-explorer' ? (
          loading ? (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="text-muted">Loading massive semantic graph from BigQuery...</div>
            </div>
          ) : (
            <KgExplorer data={graphData} onRefresh={fetchGraphs} />
          )
        ) : activeTab === 'history' ? (
          <VersionControlDashboard />
        ) : activeTab === 'ai-chat' ? (
          <AiChatDashboard />
        ) : (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 className="text-muted">Content for {activeTab} coming soon.</h2>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default App;
