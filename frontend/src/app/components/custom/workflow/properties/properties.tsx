"use client";

import { AppNode } from "@/app/types/store";
import ApiNodeProperties from "./apiNodeProperties";
import ResultNodeProperties from "./resultNodeProperties";
import { nodeTypes } from "../nodes";
import React from "react";

interface PropertiesProps {
  node: AppNode;
}

export default function Properties({ node }: PropertiesProps) {
  const label = String(node.data?.label || "Unknown");


  const nodePropertiesMap: Record<keyof typeof nodeTypes, React.ReactNode> = {
    api: <ApiNodeProperties />,
    result: <ResultNodeProperties />,
    start: <></>
  }

  return (
    <div className="w-64 h-full bg-gray-200 border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">{label}</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Node ID</label>
          <p className="mt-1 text-sm text-gray-600">{node.id}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Node Type</label>
          <p className="mt-1 text-sm text-gray-600">{node.type}</p>
        </div>
      </div>

      {nodePropertiesMap[node.type as keyof typeof nodeTypes]}
    </div>
  );
}
