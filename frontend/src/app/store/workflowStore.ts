import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

import { AppState, NodeExecutionState, NodeStateUpdate } from "../types/store";
import { initialNodes } from "./nodes";
import { initialEdges } from "./edges";

const MAX_LOGS_PER_NODE = 100;

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<AppState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNode: null,
    nodeStates: new Map(),
    workflowId: undefined,
    executionStartTime: undefined,
    isExecuting: false,

    // Graph manipulation
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    setNodes: (nodes) => {
        set({ nodes });
    },
    setEdges: (edges) => {
        set({ edges });
    },
    setSelectedNode: (node) => {
        set({ selectedNode: node });
    },

    // Execution state management
    updateNodeState: (nodeId: string, update: Partial<NodeExecutionState>) => {
        const currentStates = new Map(get().nodeStates);
        const currentState = currentStates.get(nodeId) || {
            status: "idle" as const,
            timestamp: Date.now(),
            logs: [],
        };

        // Merge updates, handling logs carefully to maintain max size
        const newState: NodeExecutionState = {
            ...currentState,
            ...update,
            timestamp: Date.now(),
        };

        // Truncate logs to MAX_LOGS_PER_NODE
        if (newState.logs && newState.logs.length > MAX_LOGS_PER_NODE) {
            newState.logs = newState.logs.slice(-MAX_LOGS_PER_NODE);
        }

        currentStates.set(nodeId, newState);
        set({ nodeStates: currentStates });
    },

    batchUpdateNodeStates: (updates: NodeStateUpdate[]) => {
        const currentStates = new Map(get().nodeStates);
        const now = Date.now();

        updates.forEach((update) => {
            const { nodeId, ...stateUpdate } = update;
            const currentState = currentStates.get(nodeId) || {
                status: "idle" as const,
                timestamp: now,
                logs: [],
            };

            const newState: NodeExecutionState = {
                ...currentState,
                ...stateUpdate,
                timestamp: stateUpdate.timestamp || now,
            };

            // Truncate logs to MAX_LOGS_PER_NODE
            if (newState.logs && newState.logs.length > MAX_LOGS_PER_NODE) {
                newState.logs = newState.logs.slice(-MAX_LOGS_PER_NODE);
            }

            currentStates.set(nodeId, newState);
        });

        set({ nodeStates: currentStates });
    },

    getNodeState: (nodeId: string) => {
        return get().nodeStates.get(nodeId);
    },

    resetNodeStates: () => {
        set({ nodeStates: new Map() });
    },

    setWorkflowId: (id: string) => {
        set({ workflowId: id });
    },

    setIsExecuting: (executing: boolean) => {
        set({ isExecuting: executing });
    },

    setExecutionStartTime: (time: number) => {
        set({ executionStartTime: time });
    },
}));

export default useStore;
