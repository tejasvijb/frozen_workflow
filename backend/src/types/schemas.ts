/**
 * Socket.IO event validators using Zod
 * Ensures type safety and runtime validation of all WebSocket payloads
 */

import { z } from "zod";

// ============ Request/Client → Server ============

export const ExecuteWorkflowSchema = z.object({
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
    }),
  ),
  nodes: z.array(
    z.object({
      data: z.record(z.string(), z.any()).optional(),
      id: z.string(),
      label: z.string().optional(),
      type: z.enum(["api", "result", "start"]),
    }),
  ),
});

export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowSchema>;

export const CancelWorkflowSchema = z.object({
  workflowId: z.string(),
});

export type CancelWorkflowRequest = z.infer<typeof CancelWorkflowSchema>;

// ============ Response/Server → Client ============

export const NodeEventSchema = z.object({
  eventType: z.enum(["complete", "error", "running", "start"]),
  nodeId: z.string(),
  payload: z
    .object({
      endTime: z.number().optional(),
      error: z.string().optional(),
      errorStack: z.string().optional(),
      logs: z.array(z.string()).optional(),
      progress: z.number().min(0).max(100).optional(),
      result: z.any().optional(),
      startTime: z.number().optional(),
      status: z.enum(["completed", "error", "idle", "running"]).optional(),
    })
    .optional(),
  timestamp: z.number().int().positive(),
});

export type NodeEvent = z.infer<typeof NodeEventSchema>;

export const WorkflowCompleteSchema = z.object({
  failedNodes: z.array(z.string()).optional(),
  status: z.enum(["failed", "success"]),
  totalTime: z.number().positive(),
  workflowId: z.string(),
});

export type WorkflowComplete = z.infer<typeof WorkflowCompleteSchema>;

export const WorkflowErrorSchema = z.object({
  code: z.string(),
  error: z.string(),
  retryable: z.boolean().optional(),
});

export type WorkflowError = z.infer<typeof WorkflowErrorSchema>;
