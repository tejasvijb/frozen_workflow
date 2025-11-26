/**
 * Hook for fetching node logs via React Query
 * Provides caching and background sync for execution logs
 */

import { useQuery } from "@tanstack/react-query";

export interface NodeLog {
    timestamp: number;
    message: string;
    level: "info" | "warning" | "error";
}

/**
 * Fetch node logs from backend (mock implementation for now)
 * In production, this would fetch from your API endpoint
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchNodeLogs(
    _nodeId: string,
    _workflowId?: string
): Promise<NodeLog[]> {
    // Mock implementation: simulate fetching logs
    // In a real scenario, this would call:
    // GET /api/v1/workflows/{_workflowId}/logs?nodeId={_nodeId}&limit=100

    return [
        {
            timestamp: Date.now() - 3000,
            message: "Node initialized",
            level: "info",
        },
        {
            timestamp: Date.now() - 2000,
            message: "Making API request...",
            level: "info",
        },
        {
            timestamp: Date.now() - 1000,
            message: "Response received",
            level: "info",
        },
    ];
}

/**
 * Hook: useNodeLogs
 * Fetches logs for a specific node with caching
 *
 * @param nodeId - The node ID to fetch logs for
 * @param workflowId - Optional workflow ID for context
 * @returns React Query useQuery result with logs
 */
export function useNodeLogs(nodeId: string, workflowId?: string) {
    return useQuery({
        queryKey: ["nodeLogs", nodeId, workflowId],
        queryFn: () => fetchNodeLogs(nodeId, workflowId),
        staleTime: 30000, // 30 seconds - logs don't change after execution completes
        gcTime: 60000, // 60 seconds - keep in cache for 1 minute
        retry: 1,
        enabled: !!nodeId,
    });
}
