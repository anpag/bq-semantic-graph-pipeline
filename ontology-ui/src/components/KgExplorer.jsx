import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Info, Layers, Network } from 'lucide-react';
import InfoModal from './InfoModal';

const colorMap = {
  'Project': '#007aff',          // Premium Royal Blue
  'AdhesiveClass': '#34c759',        // Emerald Green
  'Formulation': '#ff9500',          // Safety Orange
  'IngredientClass': '#af52de',     // Deep Violet
  'Ingredient': '#5856d6',          // Indigo
  'IngredientProportion': '#ff2d55', // Coral Red
  'inferred': '#8e8e93',
  'unknown': '#8e8e93'
};

const groupLevels = {
  'Project': 0,
  'AdhesiveClass': 1,
  'Formulation': 2,
  'IngredientClass': 3,
  'Ingredient': 4,
  'IngredientProportion': 5
};

export default function KgExplorer({ data }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormulation, setSelectedFormulation] = useState('All');
  const [layoutMode, setLayoutMode] = useState('hierarchy'); // Default to static hierarchy
  
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update canvas dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  // Manage D3 forces based on active layout mode
  useEffect(() => {
    if (fgRef.current) {
      if (layoutMode === 'hierarchy') {
        // Completely freeze physics by setting force strengths to 0
        // This is safe and prevents any console type errors from nulling forces
        const chargeForce = fgRef.current.d3Force('charge');
        if (chargeForce) chargeForce.strength(0);

        const linkForce = fgRef.current.d3Force('link');
        if (linkForce) linkForce.strength(0);

        const centerForce = fgRef.current.d3Force('center');
        if (centerForce) centerForce.strength(0);

        const xForce = fgRef.current.d3Force('x');
        if (xForce) xForce.strength(0);

        const yForce = fgRef.current.d3Force('y');
        if (yForce) yForce.strength(0);
      } else {
        // Restore standard physics forces for Mesh mode
        const chargeForce = fgRef.current.d3Force('charge');
        if (chargeForce) chargeForce.strength(-300);

        const linkForce = fgRef.current.d3Force('link');
        if (linkForce) linkForce.strength(1).distance(90);

        const centerForce = fgRef.current.d3Force('center');
        if (centerForce) centerForce.strength(1);
      }
      fgRef.current.d3ReheatSimulation();
    }
  }, [data, selectedFormulation, layoutMode]);

  // Handle camera positioning defensively when layout mode changes
  useEffect(() => {
    if (fgRef.current) {
      if (layoutMode === 'hierarchy') {
        // Instantly center camera at (0, 0) and zoom to nicely show everything
        fgRef.current.centerAt(0, -20, 300); // Slight upward bias
        fgRef.current.zoom(1.1, 300);
      } else {
        // Zoom to fit after simulation starts organizing
        const timer = setTimeout(() => {
          if (fgRef.current && layoutMode === 'mesh') {
            fgRef.current.zoomToFit(400, 40);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [layoutMode, data, selectedFormulation]);

  // Extract unique formulations for filtering
  const formulations = useMemo(() => {
    if (!data || !data.nodes) return [];
    return data.nodes.filter(n => n.group === 'Formulation').map(n => n.id);
  }, [data]);

  // Filter nodes and edges based on selection
  const filteredData = useMemo(() => {
    if (!data || !data.nodes || selectedFormulation === 'All') return data;
    
    const relevantNodeIds = new Set([selectedFormulation]);
    
    // 1st Degree connections
    data.links.forEach(link => {
       const sourceId = link.source.id || link.source;
       const targetId = link.target.id || link.target;
       if (sourceId === selectedFormulation) relevantNodeIds.add(targetId);
       if (targetId === selectedFormulation) relevantNodeIds.add(sourceId);
    });

    // 2nd Degree connections
    data.links.forEach(link => {
       const sourceId = link.source.id || link.source;
       const targetId = link.target.id || link.target;
       if (relevantNodeIds.has(sourceId)) relevantNodeIds.add(targetId);
       if (relevantNodeIds.has(targetId)) relevantNodeIds.add(sourceId);
    });

    return {
      nodes: data.nodes.filter(n => relevantNodeIds.has(n.id)),
      links: data.links.filter(l => {
        const sourceId = l.source.id || l.source;
        const targetId = l.target.id || l.target;
        return relevantNodeIds.has(sourceId) && relevantNodeIds.has(targetId);
      })
    };
  }, [data, selectedFormulation]);

  // Height coordinate helper centered around 0
  const maxLevel = 5;
  const getLevelY = useCallback((level) => {
    const marginY = 50;
    const usableHeight = dimensions.height - marginY * 2;
    return -usableHeight / 2 + (level / maxLevel) * usableHeight;
  }, [dimensions.height]);

  // Compile final graph nodes & edges with static or dynamic coordinates
  const graphData = useMemo(() => {
    if (!filteredData || !filteredData.nodes) return { nodes: [], links: [] };
    
    // 1. Map into structured nodes
    const processedNodes = filteredData.nodes.map(n => {
      const level = groupLevels[n.group] !== undefined ? groupLevels[n.group] : 5;
      return {
        id: n.id,
        name: n.label || n.id,
        group: n.group,
        color: colorMap[n.group] || colorMap['unknown'],
        level: level
      };
    });

    // 2. If hierarchy is active, calculate symmetric centered coordinates
    if (layoutMode === 'hierarchy') {
      const nodesByLevel = {};
      processedNodes.forEach(node => {
        if (!nodesByLevel[node.level]) {
          nodesByLevel[node.level] = [];
        }
        nodesByLevel[node.level].push(node);
      });

      processedNodes.forEach(node => {
        const levelNodes = nodesByLevel[node.level] || [];
        const index = levelNodes.indexOf(node);
        const totalInLevel = levelNodes.length;

        // Horizontally space out evenly centered around 0
        const marginX = 80;
        const usableWidth = dimensions.width - marginX * 2;
        if (totalInLevel === 1) {
          node.fx = 0;
        } else {
          node.fx = -usableWidth / 2 + (index / (totalInLevel - 1)) * usableWidth;
        }

        // Vertically place centered around 0
        let levelY = getLevelY(node.level);

        // Stagger nodes in populous tiers to prevent horizontal overlap of text labels
        if (totalInLevel > 5) {
          const staggerOffset = 25;
          if (index % 2 === 0) {
            levelY += staggerOffset;
          } else {
            levelY -= staggerOffset;
          }
        }

        node.fy = levelY;
        node.x = node.fx;
        node.y = node.fy;
      });
    } else {
      // Clear fixed positions to let physics mesh take over
      processedNodes.forEach(node => {
        node.fx = undefined;
        node.fy = undefined;
      });
    }

    return {
      nodes: processedNodes,
      links: filteredData.links.map(l => ({
        source: l.source.id || l.source,
        target: l.target.id || l.target,
        name: l.label || ''
      }))
    };
  }, [filteredData, dimensions, layoutMode, getLevelY]);

  // Premium Canvas painting function for high-fidelity text-nodes
  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1.2); 

    // Smooth rounded background panel
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(
      node.x - bckgDimensions[0] / 2, 
      node.y - bckgDimensions[1] / 2, 
      bckgDimensions[0], 
      bckgDimensions[1], 
      6 / globalScale
    );
    ctx.fill();

    // Colored glowing border outline
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();

    // Render node label centered
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1D1D1F'; // Dark Apple gray
    ctx.fillText(label, node.x, node.y);

    node.__bckgDimensions = bckgDimensions; 
  }, []);

  const paintNodePointerArea = useCallback((node, color, ctx, globalScale) => {
    ctx.fillStyle = color;
    let bckgDimensions = node.__bckgDimensions;
    if (!bckgDimensions) {
      const label = node.name || '';
      const fontSize = 12 / (globalScale || 1);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1.2);
    }
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
  }, []);

  return (
    <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>Knowledge Graph Explorer</h2>
          <p style={{ color: 'var(--text-muted)' }}>Explore instantiated entities and their actual relationships.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Formulation Filter dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter by Formulation:</span>
            <select 
              value={selectedFormulation} 
              onChange={(e) => setSelectedFormulation(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.8)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <option value="All">All Formulations</option>
              {formulations.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Layout Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '2px',
            borderRadius: '8px',
            border: '1px solid var(--border-glass)'
          }}>
            <button
              onClick={() => setLayoutMode('hierarchy')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: layoutMode === 'hierarchy' ? '#FFFFFF' : 'transparent',
                color: layoutMode === 'hierarchy' ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: layoutMode === 'hierarchy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={14} />
              Hierarchy
            </button>
            <button
              onClick={() => setLayoutMode('mesh')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: layoutMode === 'mesh' ? '#FFFFFF' : 'transparent',
                color: layoutMode === 'mesh' ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: layoutMode === 'mesh' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Network size={14} />
              Dynamic Mesh
            </button>
          </div>

          {/* Help Modal */}
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
            How does the Graph work?
          </button>
        </div>
      </header>

      {/* ForceGraph Container */}
      <div ref={containerRef} className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f8fafc', padding: 0, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintNodePointerArea}
          linkWidth={1.5}
          linkColor={() => 'rgba(0,0,0,0.12)'}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          backgroundColor="#f8fafc"
          cooldownTicks={layoutMode === 'hierarchy' ? 0 : 120} // Disable simulation run for static hierarchy layout
          onNodeDragStart={node => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeDrag={node => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeDragEnd={node => {
            if (layoutMode === 'hierarchy') {
              // Snap back to the level tier but keep the dragged horizontal position
              node.fx = node.x;
              node.fy = getLevelY(node.level);
            } else {
              // Maintain standard drag behavior in mesh mode (pin node position)
              node.fx = node.x;
              node.fy = node.y;
            }
          }}
        />
      </div>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Knowledge Graph Generation">
        <p>The <strong>Knowledge Graph Explorer</strong> demonstrates the <strong>generation of a Knowledge Graph</strong> by applying the resulted ontology to the ingested R&D data.</p>
        <p>Every node here represents a real, tangible entity extracted from an R&D document by <strong>Vertex AI</strong>, such as a specific test score ("3000 psi") or a specific formulation batch ("FH-001").</p>
        <h4 style={{ marginTop: '16px', marginBottom: '8px', color: 'var(--text-main)' }}>The Pipeline:</h4>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Vertex AI reads the raw files (PDFs, Excel).</li>
          <li>It generates a "Chain-of-Thought" extraction plan.</li>
          <li>It outputs raw JSON triples (source, edge, target) that adhere <em>perfectly</em> to the generated Ontology constraints.</li>
          <li>The triples are inserted into a <strong>BigQuery Semantic Clean Room</strong>.</li>
          <li>BigQuery executes instantaneous <code>Graph View</code> queries across millions of edges to build the final structural view.</li>
          <li>This dashboard fetches the real-time structure and renders it as an interactive 3D particle graph.</li>
        </ol>
      </InfoModal>
    </div>
  );
}
