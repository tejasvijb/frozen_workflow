# Real-Time Workflow Visualization System

## Design & Implementation Brief

---

## Executive Summary

This document outlines the architecture and implementation strategy for a high-performance, real-time workflow visualization system that scales to 100+ nodes. The solution prioritizes live synchronization with backend APIs, contextual debugging capabilities, and smooth interactive performance through WebSocket streaming, optimized state management, and efficient rendering techniques.

---

## 1. Architecture & State Flow

### 1.1 Real-Time Update Strategy

**Technology Choice: Socket.IO with Event Streaming**

We adopt **Socket.IO v4** (already installed) as the primary real-time transport, augmented with React Query for server-state caching and syncing. This approach provides:

-   **Bidirectional communication**: Clients send workflow execution commands; server emits state updates
-   **Automatic reconnection**: Socket.IO handles connection failures with exponential backoff
-   **Namespace isolation**: `/workflows` namespace isolates workflow-specific events from other potential real-time concerns
-   **Fallback support**: Automatic downgrade to polling if WebSocket is unavailable

**Event Architecture**:

```
CLIENT SENDS (Workflow Execution)
├── execute:workflow { workflowId, nodeConfigs[] }
└── cancel:workflow { workflowId }

SERVER EMITS (Execution Progress)
├── node:start { nodeId, timestamp, nodeType }
├── node:running { nodeId, progress, metrics }
├── node:complete { nodeId, result, timestamp }
├── node:error { nodeId, error, errorLog, timestamp }
└── workflow:complete { workflowId, totalTime }
```

### 1.2 Node State Synchronization Architecture

**Zustand Store Structure with Batch Updates**:

```typescript
// Main workflow state
interface WorkflowState {
    // Graph data
    nodes: AppNode[];
    edges: Edge[];

    // Execution state (isolated per-node for fine-grained reactivity)
    nodeStates: Map<string, NodeExecutionState>;

    // Metadata
    workflowId?: string;
    executionStartTime?: number;

    // Actions
    updateNodeState(nodeId: string, state: NodeExecutionState): void;
    batchUpdateNodes(updates: Array<{ nodeId; state }>): void;
    setWorkflowId(id: string): void;
}

interface NodeExecutionState {
    status: "idle" | "running" | "completed" | "error";
    timestamp: number;
    logs: string[];
    error?: string;
    result?: unknown;
    progress?: number;
}
```

**Rationale for State Isolation**:

-   **Per-node state**: Each node's status is tracked independently, enabling granular subscriptions
-   **Batch updates**: Multi-node updates (e.g., 10 nodes completing simultaneously) are batched into a single store update via `batchUpdateNodes()`, preventing React re-render thrashing
-   **Zustand selectors**: Components subscribe only to their node's state slice, preventing unnecessary renders when sibling nodes update

**Data Flow**:

1. WebSocket event arrives: `{ nodeId: "node-1", status: "complete", result: {...} }`
2. Socket service collects events in 100ms buffer → `batchUpdateNodes([...])`
3. Zustand store updates Map atomically
4. Only components subscribed to `node-1` re-render

### 1.3 Backend API & WebSocket Integration

**Express Setup**:

-   Socket.IO server initialized in `backend/src/index.ts`
-   Middleware: CORS configured to accept frontend origin, authentication tokens validated per connection
-   Event validation: All incoming events validated via Zod schemas before processing

**Backend Event Handlers** (pseudo-code):

```typescript
io.on("connection", (socket) => {
    socket.on("execute:workflow", async (data) => {
        const workflowSchema = z.object({
            nodeConfigs: z.array(NodeConfigSchema),
        });
        const validated = workflowSchema.parse(data);

        // Execute workflow asynchronously
        executeWorkflow(validated, (event) => {
            socket.emit(`node:${event.eventType}`, event.payload);
        });
    });
});
```

**Workflow Execution Flow**:

1. Client sends `execute:workflow` with node configurations
2. Backend validates payload, creates execution context
3. Iterates through nodes (respecting DAG dependencies):
    - Emit `node:start`
    - Execute node logic (API calls, data transforms)
    - Emit `node:running` with progress
    - Emit `node:complete` or `node:error`
4. Client receives events, updates Zustand store
5. UI re-renders with live status updates

---

## 2. Performance Optimizations

### 2.1 Canvas & Rendering Optimization

**React Flow Virtualization**:

-   Leverage React Flow's built-in viewport-based rendering
-   Only render nodes/edges visible in current viewport
-   Lazy-load node details (logs, metrics) on-demand

**Component Memoization**:

-   Wrap node components with `React.memo` to prevent re-renders when props unchanged
-   Node component receives `status` and `label`; only re-renders if these change
-   Use shallow comparison for status objects: `{ status: 'complete', timestamp: 123 }`

**Example Memoized Node**:

```typescript
const ApiNode = React.memo(
    ({ data, isSelected }) => {
        // Component only re-renders if data.status or isSelected changes
        return (
            <NodeTemplate
                data={data}
                status={data.status}
                selected={isSelected}
            />
        );
    },
    (prevProps, nextProps) =>
        prevProps.data.status === nextProps.data.status &&
        prevProps.isSelected === nextProps.isSelected
);
```

### 2.2 State Update & Re-render Batching

**Debounced Batch Updates**:

-   Socket service collects events in 100ms window
-   Flushes batch via `batchUpdateNodes()` once window closes or batch reaches 50 items
-   Result: 100 state changes compressed into 1-2 re-render cycles

**Zustand Batch Subscription**:

```typescript
// Component subscribes to nodeStates snapshot, not full store
const nodeState = useWorkflowStore((state) => state.nodeStates.get(nodeId));
// Re-render only if this node's state changed
```

### 2.3 Memory Management

**Log Truncation**:

-   Store max 100 log lines per node (older logs discarded)
-   Prevents unbounded memory growth in long-running workflows

**Efficient Event Payloads**:

-   Server sends minimal data per event: `{ nodeId, status, timestamp }`
-   Results cached separately via React Query for lazy loading

### 2.4 Network Optimization

**Payload Compression**:

-   Use Socket.IO's native compression: `transports: ['websocket']` (avoid polling fallback)
-   Batch 5-10 events per message (~500 bytes total)

**Request Deduplication** (React Query):

-   Query key: `['nodeLogs', nodeId]`
-   Stale time: 30s (logs don't change after execution completes)
-   Prevents redundant API calls for same node's logs

---

## 3. User Experience & Accessibility

### 3.1 Visual Status Indicators

**Node Badge/Color System**:

| Status    | Color | Icon         | Animation |
| --------- | ----- | ------------ | --------- |
| idle      | gray  | -            | none      |
| running   | blue  | spinner      | pulse     |
| completed | green | checkmark    | fade-in   |
| error     | red   | alert-circle | shake     |

**Implementation**:

```tsx
<StatusBadge status={nodeState.status}>
    {statusIcon[nodeState.status]}
</StatusBadge>
```

### 3.2 Contextual Debug Information

**Side Panel (Right Drawer)** on Node Click:

```
┌─ Node: Process Order ─────────────────┐
│ Status: ✓ Completed                   │
│ Started: 2025-11-25 14:32:01          │
│ Duration: 2.34s                       │
│                                       │
│ Logs (Recent):                        │
│ ├─ [14:32:01] Initialized node        │
│ ├─ [14:32:02] API call started        │
│ └─ [14:32:03] ✓ Response received     │
│                                       │
│ Result Preview:                       │
│ { orderId: "ORD-123", status: "ok" }  │
│                                       │
│ Error (if applicable):                │
│ Connection timeout at 14:34:05        │
└───────────────────────────────────────┘
```

**Information Hierarchy**:

1. Primary: Node name, execution status, duration
2. Secondary: Logs (last 10 entries, scrollable)
3. Tertiary: Result data (collapsible JSON viewer)
4. Error state: Red border, error message, stack trace (if applicable)

### 3.3 Keyboard Navigation & Focus Management

**Supported Interactions**:

-   `Arrow keys`: Navigate between nodes
-   `Enter`: Select focused node, open debug panel
-   `Escape`: Close debug panel, return focus to canvas
-   `Ctrl+F`: Search/filter nodes by name or status
-   `Space`: Pan/zoom canvas

**Focus Management**:

-   Trap focus in debug panel when open (using `focus-trap` library or manual implementation)
-   Return focus to previously-selected node when panel closes
-   Announce status changes to screen readers via ARIA live regions

### 3.4 Error Visibility & Debugging

**On Node Error**:

1. Node badge turns red with pulsing animation
2. Error banner appears at top of canvas: "Node 'API Call' failed"
3. User clicks node → side panel shows:
    - Error message (e.g., "Connection timeout after 5000ms")
    - Stack trace (if available from backend)
    - Suggested actions: "Retry node", "Skip to next", "Cancel workflow"
4. Console logs frontend metrics: `[Workflow] Node 'API Call' error after 2345ms`

**Offline/Reconnection Handling**:

-   Banner: "Disconnected from server. Reconnecting..."
-   Pending updates queued locally; auto-sync on reconnection
-   Failed updates marked with warning icon in logs

---

## 4. Integration with Backend APIs

### 4.1 Data Contract Alignment

**HTTP REST Endpoints**:

```
POST /api/v1/workflows
  Request: { name, nodeConfigs: [{id, type, config}] }
  Response: { workflowId, status: 'created' }

GET /api/v1/workflows/{id}/logs?nodeId={nodeId}&limit=100
  Response: { logs: [{ timestamp, message, level }] }

GET /api/v1/workflows/{id}/result?nodeId={nodeId}
  Response: { nodeId, result, completedAt }
```

**WebSocket Events** (Zod-validated):

```typescript
const NodeEventSchema = z.object({
    nodeId: z.string(),
    eventType: z.enum(["start", "running", "complete", "error"]),
    timestamp: z.number(),
    payload: z.record(z.any()).optional(),
});
```

### 4.2 Authentication & Authorization

**WebSocket Handshake**:

1. Client sends Bearer token in Socket.IO connection payload
2. Server validates token in `io.use()` middleware
3. Attach user context to socket for subsequent event handlers
4. Events auto-filtered by user's workflow permissions

```typescript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const user = validateToken(token);
    if (!user) return next(new Error("Unauthorized"));
    socket.data.userId = user.id;
    next();
});
```

### 4.3 Error Handling & Retry Logic

**Client-Side Retry Strategy**:

-   Transient errors (connection timeout, 429 too many requests): Exponential backoff (100ms, 200ms, 400ms, 800ms, stop)
-   Permanent errors (401 unauthorized, 404 not found): Fail immediately, display user message
-   Workflow-level errors: Save workflow snapshot to localStorage, allow resume

**Backend Error Response**:

```typescript
{
  nodeId: "node-1",
  eventType: "error",
  payload: {
    errorCode: "API_TIMEOUT",
    message: "External API did not respond within 5000ms",
    retryable: true,
    timestamp: 1700929521234
  }
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)

-   Extend Zustand store with node states
-   Initialize Socket.IO server
-   Build Socket.IO client service
-   Update node components with status visualization

### Phase 2: Real-Time Sync (Week 2)

-   Implement backend event handlers
-   Wire WebSocket events to Zustand updates
-   Batch updates mechanism
-   Test with 10-50 node workflows

### Phase 3: Debug Experience (Week 3)

-   Build contextual side panel
-   React Query integration for logs/results
-   Error handling & offline fallback
-   Performance monitoring

### Phase 4: Optimization & Polish (Week 4)

-   Canvas virtualization
-   Memoization audit
-   Load testing with 100+ nodes
-   Animation transitions
-   Accessibility audit (keyboard nav, screen reader)

---

## 6. Success Metrics

| Metric                                 | Target             | Measurement                    |
| -------------------------------------- | ------------------ | ------------------------------ |
| Canvas responsiveness (50 nodes)       | < 60ms             | React DevTools Profiler        |
| WebSocket latency (node update)        | < 200ms            | `console.time('socket-event')` |
| Initial render                         | < 1s               | Lighthouse                     |
| State batch size                       | 5-10 events/batch  | Socket service telemetry       |
| Node re-render rate (running workflow) | < 5 re-renders/sec | React DevTools highlights      |
| Memory footprint (100 nodes)           | < 50MB             | Chrome DevTools                |

---

## 7. Technology Stack Summary

| Layer           | Technology              | Rationale                                                    |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| Real-time Comms | Socket.IO v4            | Bidirectional, auto-reconnect, widely-supported              |
| Client State    | Zustand                 | Lightweight, minimal boilerplate, fine-grained subscriptions |
| Server State    | React Query             | Caching, deduplication, background sync                      |
| Rendering       | React Flow + React.memo | Efficient canvas, memoization prevents re-renders            |
| Backend         | Express + Socket.IO     | Simple setup, integrates easily with Node.js                 |
| Validation      | Zod                     | Runtime schema validation, TypeScript inference              |

---

## Conclusion

This architecture prioritizes **real-time responsiveness** (WebSocket + batching), **state isolation** (per-node Zustand slices), and **developer clarity** (contextual debug panels). Combined with rendering optimizations (memoization, virtualization) and robust error handling, the system will scale smoothly to 100+ nodes while maintaining sub-200ms latency and a responsive user experience.
