/**
 * Socket.IO Event Emitter Service
 * Handles emitting workflow execution events to connected clients
 */

import { Server as SocketIOServer } from "socket.io";

import { NodeEvent, WorkflowComplete } from "../types/schemas.js";

export interface EventEmitterConfig {
  batchSize?: number;
  batchWindow?: number; // milliseconds
}

export class WorkflowEventEmitter {
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: Required<EventEmitterConfig>;
  private eventQueues: Map<string, NodeEvent[]> = new Map();
  private io: SocketIOServer;

  constructor(io: SocketIOServer, config: EventEmitterConfig = {}) {
    this.io = io;
    this.config = {
      batchSize: config.batchSize || 10,
      batchWindow: config.batchWindow || 100,
    };
  }

  /**
   * Cleanup when workflow ends
   */
  cleanup(socketId: string, workflowId: string): void {
    const queueKey = `${socketId}:${workflowId}`;

    // Flush any remaining events
    this.flushBatch(socketId, workflowId, queueKey);

    // Clear timer
    const timer = this.batchTimers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(queueKey);
    }
  }

  /**
   * Emit a node event to the client
   * Events are batched to reduce WebSocket overhead
   */
  emitNodeEvent(socketId: string, workflowId: string, event: NodeEvent): void {
    const queueKey = `${socketId}:${workflowId}`;

    if (!this.eventQueues.has(queueKey)) {
      this.eventQueues.set(queueKey, []);
    }

    const queue = this.eventQueues.get(queueKey)!;
    queue.push(event);

    // Flush if batch size reached
    if (queue.length >= this.config.batchSize) {
      this.flushBatch(socketId, workflowId, queueKey);
    } else if (!this.batchTimers.has(queueKey)) {
      // Schedule flush after batch window
      const timer = setTimeout(() => {
        this.flushBatch(socketId, workflowId, queueKey);
      }, this.config.batchWindow);

      this.batchTimers.set(queueKey, timer);
    }
  }

  /**
   * Emit events immediately without batching (for critical events)
   */
  emitNodeEventImmediate(socketId: string, workflowId: string, event: NodeEvent): void {
    this.io.to(socketId).emit("workflow:node-event", {
      count: 1,
      event,
      workflowId,
    });
  }

  /**
   * Emit workflow completion event
   */
  emitWorkflowComplete(socketId: string, workflowComplete: WorkflowComplete): void {
    this.io.to(socketId).emit("workflow:complete", workflowComplete);
  }

  /**
   * Emit workflow error event
   */
  emitWorkflowError(socketId: string, workflowId: string, code: string = "WORKFLOW_ERROR", error?: string): void {
    this.io.to(socketId).emit("workflow:error", {
      code,
      error,
      workflowId,
    });
  }

  /**
   * Flush batched events
   */
  private flushBatch(socketId: string, workflowId: string, queueKey: string): void {
    const queue = this.eventQueues.get(queueKey);

    if (!queue || queue.length === 0) return;

    // Clear timer if exists
    const timer = this.batchTimers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(queueKey);
    }

    // Emit batch
    this.io.to(socketId).emit("workflow:node-events-batch", {
      count: queue.length,
      events: queue,
      workflowId,
    });

    // Clear queue
    this.eventQueues.delete(queueKey);
  }
}

export default WorkflowEventEmitter;
