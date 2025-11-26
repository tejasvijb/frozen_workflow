import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";

// import connectDb from "./api/v1/config/dbConnection.js";
// import { apiV1Router } from "./api/v1/index.js";
import WorkflowEventEmitter from "./services/workflowEventEmitter.js";
import { ExecuteWorkflowSchema } from "./types/schemas.js";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    credentials: true,
    methods: ["GET", "POST"],
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
  },
  transports: ["websocket", "polling"],
});

const workflowEventEmitter = new WorkflowEventEmitter(io, {
  batchSize: 10,
  batchWindow: 100,
});

app.use(express.json());
app.use(morgan("dev"));

// app.use("/api/v1", apiV1Router);

// ============ Socket.IO Event Handlers ============

io.on("connection", (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  /**
   * Execute a workflow
   * Client sends workflow definition (nodes + edges)
   * Server simulates execution and emits progress events
   */
  socket.on("workflow:execute", async (data: unknown) => {
    try {
      const validated = ExecuteWorkflowSchema.parse(data);
      const workflowId = `workflow-${Date.now()}`;

      console.log(`[Workflow] Starting ${workflowId} with ${validated.nodes.length} nodes`);

      socket.emit("workflow:started", { workflowId });

      // Simulate workflow execution (demo purpose)
      simulateWorkflowExecution(socket.id, workflowId, validated.nodes, workflowEventEmitter);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? `Validation error: ${error.issues[0]?.message ?? "Unknown"}`
          : error instanceof Error
            ? error.message
            : "Unknown error";

      console.error(`[Workflow] Error:`, message);
      socket.emit("workflow:error", {
        code: "VALIDATION_ERROR",
        error: message,
      });
    }
  });

  /**
   * Cancel an ongoing workflow
   */
  socket.on("workflow:cancel", (data: unknown) => {
    try {
      const { workflowId } = z.object({ workflowId: z.string() }).parse(data);
      console.log(`[Workflow] Cancel requested for ${workflowId}`);
      socket.emit("workflow:cancelled", { workflowId });
    } catch {
      socket.emit("workflow:error", {
        code: "INVALID_REQUEST",
        error: "Invalid cancel request",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

/**
 * Simulate workflow execution for demo purposes
 * In production, this would execute actual node logic (API calls, data transforms, etc.)
 */
function simulateWorkflowExecution(
  socketId: string,
  workflowId: string,
  nodes: Array<{ id: string; label?: string; type: string }>,
  emitter: WorkflowEventEmitter,
): void {
  const workflowStartTime = Date.now();

  // Process nodes sequentially
  (async () => {
    try {
      for (const node of nodes) {
        const nodeStartTime = Date.now();

        // Emit node start
        emitter.emitNodeEvent(socketId, workflowId, {
          eventType: "start",
          nodeId: node.id,
          payload: {
            startTime: nodeStartTime,
            status: "running",
          },
          timestamp: nodeStartTime,
        });

        // Simulate node execution with random delay (1-3 seconds)
        const delay = Math.random() * 2000 + 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const nodeEndTime = Date.now();

        // Randomly fail 10% of nodes for demo
        if (Math.random() < 0.1) {
          emitter.emitNodeEvent(socketId, workflowId, {
            eventType: "error",
            nodeId: node.id,
            payload: {
              endTime: nodeEndTime,
              error: "Simulated API timeout",
              startTime: nodeStartTime,
              status: "error",
            },
            timestamp: nodeEndTime,
          });
        } else {
          // Emit node completion
          emitter.emitNodeEvent(socketId, workflowId, {
            eventType: "complete",
            nodeId: node.id,
            payload: {
              endTime: nodeEndTime,
              result: { message: `${node.label || node.type} executed successfully` },
              startTime: nodeStartTime,
              status: "completed",
            },
            timestamp: nodeEndTime,
          });
        }
      }

      // Emit workflow completion
      const totalTime = Date.now() - workflowStartTime;
      emitter.emitWorkflowComplete(socketId, {
        failedNodes: [],
        status: "success",
        totalTime,
        workflowId,
      });

      emitter.cleanup(socketId, workflowId);
    } catch (error) {
      console.error(`[Workflow] Execution error:`, error);
      emitter.emitWorkflowError(socketId, workflowId, "EXECUTION_ERROR", error instanceof Error ? error.message : "Unknown error");
      emitter.cleanup(socketId, workflowId);
    }
  })();
}

const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📡 WebSocket ready for connections`);
});
