"use client"

import { Handle, NodeProps, Position } from "@xyflow/react";
import { Server } from "lucide-react";

export function ApiNode(props: NodeProps): React.ReactNode {
  console.log(props)
  return (
    <div className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-purple-500 text-white font-bold ${props.selected ? "border-2 border-gray-600 shadow-lg shadow-purple-400" : ""}`}>
      <Server size={24} />
      <span>API Node</span>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
