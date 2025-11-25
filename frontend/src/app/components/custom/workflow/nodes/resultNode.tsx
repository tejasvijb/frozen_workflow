"use client"

import { Handle, NodeProps, Position } from "@xyflow/react";
import { CheckCircle } from "lucide-react";

export function ResultNode(props: NodeProps): React.ReactNode {
  console.log(props)
  return (
    <div className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-green-500 text-white font-bold ${props.selected ? "border-2 border-gray-600 shadow-lg shadow-green-400" : ""}`}>
      <CheckCircle size={24} />
      <span>Result</span>
      <Handle type="target" position={Position.Left} />

    </div>
  );
}
