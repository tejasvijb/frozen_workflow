"use client";

import React from 'react';
import { ReactFlow } from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/app/hooks/useWorkflowStore';
import { AppNode } from '@/app/types/store';
import { nodeTypes } from './nodes';
import Properties from './properties/properties';
import { FloatingStartButton } from './FloatingStartButton';

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectedNode, setSelectedNode, setNodes } = useWorkflowStore();

  const handleNodeClick = (event: React.MouseEvent, node: AppNode) => {
    setSelectedNode(node);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
  };

  const handleStartWorkflow = () => {

  };

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
        />
        <FloatingStartButton onClick={handleStartWorkflow} />
      </div>
      {selectedNode && <Properties node={selectedNode} />}
    </div>
  );
}

export default Flow;
