/**
 * Socket.IO Client Service
 * Manages WebSocket connection and real-time workflow event streaming
 */

import { io, Socket } from "socket.io-client";
import useStore from "@/app/store/workflowStore";
import { NodeStateUpdate } from "@/app/types/store";

/**
 * Workflow node configuration
 * @public
 */
export interface WorkflowNode {
    id: string;
    type: string;
    label?: string;
    data?: Record<string, unknown>;
}

/**
 * Workflow edge connection
 * @public
 */
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
}

/**
 * Single node event data
 * @public
 */
export interface NodeEventData {
    workflowId: string;
    event: NodeEvent;
}

/**
 * Batched node events
 * @public
 */
export interface NodeEventsBatchData {
    workflowId: string;
    events: NodeEvent[];
    count: number;
}

/**
 * Node event structure
 * @public
 */
export interface NodeEvent {
    nodeId: string;
    eventType: "start" | "running" | "complete" | "error";
    timestamp: number;
    payload?: Record<string, unknown>;
}

export interface SocketServiceConfig {
    url: string;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    enableLogging?: boolean;
}

class SocketService {
    private socket: Socket | null = null;
    private config: SocketServiceConfig;
    private reconnectAttempts = 0;
    private eventQueue: Array<{ event: string; data: unknown }> = [];
    private isQueueing = false;

    constructor(config: SocketServiceConfig) {
        this.config = {
            reconnectDelay: config.reconnectDelay || 3000,
            maxReconnectAttempts: config.maxReconnectAttempts || 5,
            enableLogging: config.enableLogging ?? true,
            ...config,
        };
    }

    /**
     * Establish WebSocket connection
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.config.url, {
                    transports: ["websocket", "polling"],
                    reconnection: true,
                    reconnectionDelay: this.config.reconnectDelay,
                    reconnectionDelayMax: this.config.reconnectDelay! * 2,
                    reconnectionAttempts: this.config.maxReconnectAttempts,
                });

                this.setupEventHandlers();

                this.socket.on("connect", () => {
                    this.log("✅ WebSocket connected");
                    this.reconnectAttempts = 0;
                    this.isQueueing = false;
                    this.flushEventQueue();
                    resolve();
                });

                this.socket.on("connect_error", (error) => {
                    this.log("❌ Connection error:", error.message);
                    reject(error);
                });
            } catch (error) {
                this.log("❌ Failed to create socket:", error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect WebSocket
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.log("👋 WebSocket disconnected");
        }
    }

    /**
     * Execute a workflow
     */
    executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
        this.emitEvent("workflow:execute", { nodes, edges });
    }

    /**
     * Cancel a workflow
     */
    cancelWorkflow(workflowId: string): void {
        this.emitEvent("workflow:cancel", { workflowId });
    }

    /**
     * Internal: Setup Socket.IO event handlers
     */
    private setupEventHandlers(): void {
        if (!this.socket) return;

        // Workflow started
        this.socket.on("workflow:started", (data: { workflowId: string }) => {
            this.log("🚀 Workflow started:", data.workflowId);
            useStore.getState().setWorkflowId(data.workflowId);
            useStore.getState().setIsExecuting(true);
            useStore.getState().setExecutionStartTime(Date.now());
            useStore.getState().resetNodeStates();

            // Add performance marker
            this.perfMark(`workflow-${data.workflowId}-start`);
        });

        // Single node event (non-batched)
        this.socket.on("workflow:node-event", (data: NodeEventData) => {
            this.handleNodeEvent(data.event);
        });

        // Batched node events (optimized)
        this.socket.on(
            "workflow:node-events-batch",
            (data: NodeEventsBatchData) => {
                this.log(`📦 Received batch of ${data.count} events`);
                const updates: NodeStateUpdate[] = data.events.map((event) =>
                    this.parseNodeEvent(event)
                );
                useStore.getState().batchUpdateNodeStates(updates);

                // Log performance metric
                this.perfMeasure(
                    `batch-${data.count}-events`,
                    `workflow-batch-start-${Date.now()}`
                );
            }
        );

        // Workflow completed
        this.socket.on(
            "workflow:complete",
            (data: {
                workflowId: string;
                totalTime: number;
                status: string;
            }) => {
                this.log(
                    `✅ Workflow completed in ${(data.totalTime / 1000).toFixed(
                        2
                    )}s`
                );
                useStore.getState().setIsExecuting(false);

                this.perfMeasure(
                    `workflow-${data.workflowId}`,
                    `workflow-${data.workflowId}-start`
                );
            }
        );

        // Workflow error
        this.socket.on(
            "workflow:error",
            (data: { workflowId?: string; error: string; code: string }) => {
                this.log("❌ Workflow error:", data.error);
                useStore.getState().setIsExecuting(false);
            }
        );

        // Workflow cancelled
        this.socket.on("workflow:cancelled", (data: { workflowId: string }) => {
            this.log("⏸️ Workflow cancelled:", data.workflowId);
            useStore.getState().setIsExecuting(false);
        });

        // Reconnection events
        this.socket.on("disconnect", () => {
            this.log(
                "⚠️ WebSocket disconnected - queuing events until reconnect"
            );
            this.isQueueing = true;
        });

        this.socket.on("reconnect", () => {
            this.log("🔄 Reconnected to WebSocket");
            this.reconnectAttempts = 0;
            this.isQueueing = false;
            this.flushEventQueue();
        });

        this.socket.on("reconnect_attempt", () => {
            this.reconnectAttempts++;
            this.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
        });
    }

    /**
     * Handle a single node event
     */
    private handleNodeEvent(event: NodeEvent): void {
        const update = this.parseNodeEvent(event);
        useStore.getState().updateNodeState(update.nodeId, {
            status: update.status,
            timestamp: update.timestamp,
            startTime: update.startTime,
            endTime: update.endTime,
            logs: update.logs,
            error: update.error,
            result: update.result,
            progress: update.progress,
        });
    }

    /**
     * Parse Socket.IO event into NodeStateUpdate format
     */
    private parseNodeEvent(event: NodeEvent): NodeStateUpdate {
        const { payload = {} } = event;
        const status = (payload.status ?? "idle") as NodeStateUpdate["status"];
        return {
            nodeId: event.nodeId,
            status: status ?? undefined,
            timestamp: event.timestamp,
            startTime: (payload.startTime ?? undefined) as number | undefined,
            endTime: (payload.endTime ?? undefined) as number | undefined,
            logs: (payload.logs ?? []) as string[],
            error: (payload.error ?? undefined) as string | undefined,
            result: payload.result,
            progress: (payload.progress ?? undefined) as number | undefined,
        };
    }

    /**
     * Emit event, with queuing support for offline scenarios
     */
    private emitEvent(eventName: string, data: unknown): void {
        if (!this.socket) {
            this.log("⚠️ Socket not connected, queueing event:", eventName);
            this.eventQueue.push({ event: eventName, data });
            return;
        }

        if (this.isQueueing) {
            this.log("⚠️ Queuing event (reconnecting):", eventName);
            this.eventQueue.push({ event: eventName, data });
            return;
        }

        try {
            this.socket.emit(eventName, data);
            this.log(`📤 Emitted: ${eventName}`);
        } catch (error) {
            this.log("❌ Failed to emit event:", error);
            this.eventQueue.push({ event: eventName, data });
        }
    }

    /**
     * Flush queued events after reconnection
     */
    private flushEventQueue(): void {
        if (this.eventQueue.length === 0) return;

        this.log(`🔄 Flushing ${this.eventQueue.length} queued events`);
        const queue = [...this.eventQueue];
        this.eventQueue = [];

        queue.forEach(({ event, data }) => {
            if (this.socket?.connected) {
                this.socket.emit(event, data);
            }
        });
    }

    /**
     * Performance logging: mark a point in time
     */
    private perfMark(label: string): void {
        if (typeof performance !== "undefined" && performance.mark) {
            performance.mark(label);
        }
    }

    /**
     * Performance logging: measure time between two marks
     */
    private perfMeasure(label: string, startMark: string): void {
        if (typeof performance !== "undefined" && performance.measure) {
            try {
                performance.measure(label, startMark);
                const measure = performance.getEntriesByName(
                    label
                )[0] as PerformanceMeasure;
                if (measure) {
                    this.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
                }
            } catch {
                // Mark not found, skip measurement
            }
        }
    }

    /**
     * Conditional logging
     */
    private log(...args: unknown[]): void {
        if (this.config.enableLogging) {
            console.log("[Socket.IO]", ...args);
        }
    }

    /**
     * Get socket connected status
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /**
     * Get socket ID
     */
    getSocketId(): string | null {
        return this.socket?.id ?? null;
    }
}

// Singleton instance
let socketService: SocketService | null = null;

export function initializeSocketService(
    config: SocketServiceConfig
): SocketService {
    if (!socketService) {
        socketService = new SocketService(config);
    }
    return socketService;
}

export function getSocketService(): SocketService {
    if (!socketService) {
        throw new Error(
            "Socket service not initialized. Call initializeSocketService first."
        );
    }
    return socketService;
}

export default SocketService;
