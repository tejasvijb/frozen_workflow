"use client"

import { Handle, NodeProps, Position } from "@xyflow/react";

export function StartNode(props: NodeProps): React.ReactNode {
  console.log(props)
  return (
    <div
      className={`flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 text-white font-bold text-lg ${props.selected ? "border-2 border-gray-600 shadow-lg shadow-blue-400" : ""
        }`}
    >
      Start
      <Handle type="source" position={Position.Right} />

    </div>
  );
}