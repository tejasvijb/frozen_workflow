"use client";

import React, { useMemo } from "react";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { AlertCircle, CheckCircle, Loader, Server } from "lucide-react";

import { AppNode } from "@/app/types/store";
import useStore from "@/app/store/workflowStore";

/**
 * API node component with status indicators and progress
 * Memoized to prevent unnecessary re-renders
 */
const ApiNode = React.memo(
  (props: NodeProps<AppNode>) => {
    const { id, selected, data } = props;

    // Subscribe only to this node's state
    const nodeState = useStore(state => state.nodeStates.get(id));

    const { statusColor, statusIcon, statusLabel } = useMemo(() => {
      switch (nodeState?.status) {
        case "running":
          return {
            statusColor: "border-blue-500 bg-blue-400",
            statusIcon: <Loader size={16} className="animate-spin" />,
            statusLabel: "Running",
          };
        case "completed":
          return {
            statusColor: "border-green-500 bg-green-400",
            statusIcon: <CheckCircle size={16} />,
            statusLabel: "Completed",
          };
        case "error":
          return {
            statusColor: "border-red-500 bg-red-400",
            statusIcon: <AlertCircle size={16} />,
            statusLabel: "Error",
          };
        default:
          return {
            statusColor: "border-purple-500 bg-purple-500",
            statusIcon: null,
            statusLabel: "API",
          };
      }
    }, [nodeState?.status]);

    return (
      <div className="relative">
        <div
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg ${statusColor} text-white font-bold transition-all duration-300 ${selected ? "border-2 border-gray-600 shadow-lg shadow-purple-400" : ""
            }`}
          title={`${statusLabel} - ${data?.label || "API Node"}`}
        >
          {statusIcon || <Server size={24} />}
          <span>{typeof data?.label === 'string' ? data.label : "API Node"}</span>
          <Handle type="target" position={Position.Left} />
          <Handle type="source" position={Position.Right} />
        </div>

        {/* Progress indicator for running nodes */}
        {nodeState?.status === "running" && nodeState.progress !== undefined && (
          <div className="absolute -bottom-6 left-0 right-0 w-full px-2">
            <div className="text-xs text-gray-600 mb-1 text-center">
              {nodeState.progress}%
            </div>
            <div className="w-full h-1 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${nodeState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status badge */}
        {nodeState && nodeState.status !== "idle" && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-800 text-white whitespace-nowrap">
            {statusLabel}
          </div>
        )}

        {/* Error indicator */}
        {nodeState?.status === "error" && typeof nodeState.error === 'string' && (
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-16 text-xs px-2 py-1 rounded bg-red-700 text-white max-w-xs truncate">
            {nodeState.error}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if id, selected, or data.label changed
    return (
      prevProps.id === nextProps.id &&
      prevProps.selected === nextProps.selected &&
      prevProps.data?.label === nextProps.data?.label
    );
  }
);

ApiNode.displayName = "ApiNode";

export { ApiNode };
