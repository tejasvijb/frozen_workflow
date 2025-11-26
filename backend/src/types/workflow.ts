/**
 * Workflow and Node type definitions for type-safe backend operations
 */

export interface NodeConfig {
  data?: Record<string, unknown>;
  id: string;
  label?: string;
  type: NodeType;
}

export interface NodeEvent {
  eventType: "complete" | "error" | "running" | "start";
  nodeId: string;
  payload?: {
    error?: string;
    errorStack?: string;
    logs?: string[];
    progress?: number;
    result?: unknown;
    status?: NodeStatus;
  };
  timestamp: number;
}

export type NodeStatus = "completed" | "error" | "idle" | "running";

export type NodeType = "api" | "result" | "start";

export interface WorkflowDefinition {
  edges: Array<{ id: string; source: string; target: string }>;
  nodes: NodeConfig[];
  workflowId: string;
}

export interface WorkflowExecutionContext {
  nodeResults: Map<string, unknown>;
  nodes: NodeConfig[];
  socketId: string;
  startTime: number;
  workflowId: string;
}
