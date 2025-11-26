"use client";

import React, { useCallback, useEffect, useMemo } from 'react';
import { ReactFlow } from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/app/hooks/useWorkflowStore';
import { AppNode } from '@/app/types/store';
import { nodeTypes } from './nodes';
import Properties from './properties/properties';
import { FloatingStartButton } from './FloatingStartButton';
import { initializeSocketService, getSocketService } from '@/services/socketService';

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectedNode, setSelectedNode } = useWorkflowStore();

  // Initialize Socket.IO on component mount
  useEffect(() => {
    const socketService = initializeSocketService({
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      enableLogging: true,
    });

    socketService.connect().catch((error) => {
      console.error('Failed to connect WebSocket:', error);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Memoize node click handler to prevent recreating on every render
  const handleNodeClick = useCallback((event: React.MouseEvent, node: AppNode) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  // Memoize pane click handler
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Memoize start workflow handler
  const handleStartWorkflow = useCallback(() => {
    try {
      const socketService = getSocketService();
      if (!socketService.isConnected()) {
        alert('Not connected to server. Please wait for connection.');
        return;
      }

      // Log performance marker
      console.log('[Workflow] Starting execution with', nodes.length, 'nodes');

      // Execute workflow via WebSocket
      socketService.executeWorkflow(
        nodes.map(n => {
          const nodeType = n.type || 'api';
          return {
            id: n.id,
            type: nodeType as 'start' | 'api' | 'result',
            label: n.data?.label as string | undefined,
            data: n.data as Record<string, unknown> | undefined,
          };
        }),
        edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        }))
      );
    } catch (error) {
      console.error('[Workflow] Error starting workflow:', error);
      alert('Failed to start workflow. Check console for details.');
    }
  }, [nodes, edges]);

  // Memoize nodeTypes to prevent recreation
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          nodeTypes={memoizedNodeTypes}
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
