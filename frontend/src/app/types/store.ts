import {
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
} from "@xyflow/react";

export type AppNode = Node;

/**
 * Execution status of a node during workflow execution.
 * - idle: Node has not been executed yet
 * - running: Node is currently executing
 * - completed: Node execution finished successfully
 * - error: Node execution failed
 */
export type NodeStatus = "idle" | "running" | "completed" | "error";

/**
 * Tracks the execution state of a single node during workflow runs.
 * Enables real-time updates via WebSocket and contextual debugging.
 */
export interface NodeExecutionState {
    status: NodeStatus;
    timestamp: number; // Last update timestamp (milliseconds)
    startTime?: number; // When execution started
    endTime?: number; // When execution completed
    logs: string[]; // Execution logs (max 100 entries)
    error?: string; // Error message if status === 'error'
    errorStack?: string; // Full error stack trace
    result?: unknown; // Execution result if status === 'completed'
    progress?: number; // Progress percentage (0-100) for long-running nodes
}

export interface NodeStateUpdate {
    nodeId: string;
    status?: NodeStatus;
    timestamp?: number;
    startTime?: number;
    endTime?: number;
    logs?: string[];
    error?: string;
    errorStack?: string;
    result?: unknown;
    progress?: number;
}

export interface BatchNodeStateUpdate {
    updates: NodeStateUpdate[];
}

export type AppState = {
    // Graph structure
    nodes: AppNode[];
    edges: Edge[];
    selectedNode: AppNode | null;

    // Execution state: nodeId -> NodeExecutionState
    nodeStates: Map<string, NodeExecutionState>;

    // Workflow metadata
    workflowId?: string;
    executionStartTime?: number;
    isExecuting: boolean;

    // Graph manipulation actions
    onNodesChange: OnNodesChange<AppNode>;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: AppNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSelectedNode: (node: AppNode | null) => void;

    // Execution state management
    updateNodeState: (
        nodeId: string,
        update: Partial<NodeExecutionState>
    ) => void;
    batchUpdateNodeStates: (updates: NodeStateUpdate[]) => void;
    getNodeState: (nodeId: string) => NodeExecutionState | undefined;
    resetNodeStates: () => void;
    setWorkflowId: (id: string) => void;
    setIsExecuting: (executing: boolean) => void;
    setExecutionStartTime: (time: number) => void;
};
