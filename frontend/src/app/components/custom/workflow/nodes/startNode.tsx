"use client";

import React, { useMemo } from "react";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

import { AppNode } from "@/app/types/store";
import useStore from "@/app/store/workflowStore";

/**
 * Start node component with status indicators
 * Memoized to prevent unnecessary re-renders
 */
const StartNode = React.memo(
  (props: NodeProps<AppNode>) => {
    const { id, selected } = props;

    // Subscribe only to this node's state
    const nodeState = useStore(state => state.nodeStates.get(id));

    const { statusColor, statusIcon, statusLabel } = useMemo(() => {
      switch (nodeState?.status) {
        case "running":
          return {
            statusColor: "border-blue-500 bg-blue-400",
            statusIcon: <Loader size={14} className="animate-spin" />,
            statusLabel: "Running",
          };
        case "completed":
          return {
            statusColor: "border-green-500 bg-green-400",
            statusIcon: <CheckCircle size={14} />,
            statusLabel: "Done",
          };
        case "error":
          return {
            statusColor: "border-red-500 bg-red-400",
            statusIcon: <AlertCircle size={14} />,
            statusLabel: "Error",
          };
        default:
          return {
            statusColor: "border-blue-500 bg-blue-500",
            statusIcon: null,
            statusLabel: "Start",
          };
      }
    }, [nodeState?.status]);

    return (
      <div className={`relative`}>
        <div
          className={`flex items-center justify-center w-16 h-16 rounded-full ${statusColor} text-white font-bold text-lg transition-all duration-300 ${selected ? "border-2 border-gray-600 shadow-lg shadow-blue-400" : ""
            }`}
          title={`${statusLabel} - ${nodeState?.timestamp ? new Date(nodeState.timestamp).toLocaleTimeString() : "Not started"}`}
        >
          {statusIcon || "Start"}
          <Handle type="source" position={Position.Right} />
        </div>

        {/* Status badge */}
        {nodeState && nodeState.status !== "idle" && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-800 text-white whitespace-nowrap">
            {statusLabel}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if id or selected changed
    // nodeState is fetched fresh via hook
    return prevProps.id === nextProps.id && prevProps.selected === nextProps.selected;
  }
);

StartNode.displayName = "StartNode";

export { StartNode };