import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 40, // Horizontal separation between nodes
    ranksep: 120, // Vertical separation between ranks
    edgesep: 15
  });

  nodes.forEach((node) => {
    // Give nodes a default width and height for dagre calculation
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return;
    
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';
    
    node.position = {
      x: nodeWithPosition.x - 100, // half of 200 width
      y: nodeWithPosition.y - 40,  // half of 80 height
    };

    return node;
  });

  return { nodes, edges };
};
