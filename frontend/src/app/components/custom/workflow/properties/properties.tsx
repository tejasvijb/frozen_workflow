"use client";

import React, { useMemo } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

import { AppNode } from "@/app/types/store";
import useStore from "@/app/store/workflowStore";
import { useNodeLogs } from "@/app/hooks/useNodeLogs";
import ApiNodeProperties from "./apiNodeProperties";
import ResultNodeProperties from "./resultNodeProperties";
import { nodeTypes } from "../nodes";

interface PropertiesProps {
  node: AppNode;
}

export default function Properties({ node }: PropertiesProps) {
  const label = String(node.data?.label || "Unknown");
  const nodeState = useStore(state => state.nodeStates.get(node.id));
  const workflowId = useStore(state => state.workflowId);
  const { data: logs } = useNodeLogs(node.id, workflowId);

  const nodePropertiesMap: Record<keyof typeof nodeTypes, React.ReactNode> = {
    api: <ApiNodeProperties />,
    result: <ResultNodeProperties />,
    start: <></>
  };

  // Calculate duration if node is running or completed
  const duration = useMemo(() => {
    if (!nodeState?.startTime) return null;
    const endTime = nodeState.endTime || nodeState.timestamp || 0;
    if (endTime === 0) return null;
    return ((endTime - nodeState.startTime) / 1000).toFixed(2);
  }, [nodeState?.startTime, nodeState?.endTime, nodeState?.timestamp]);


  // Format timestamp
  const formattedTime = useMemo(() => {
    if (nodeState && nodeState.timestamp) {
      return new Date(nodeState.timestamp).toLocaleTimeString();
    }
    return null;
  }, [nodeState]);

  return (
    <div className="w-80 h-full bg-white border-l border-gray-300 shadow-lg flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
          {nodeState && (
            <div className="flex items-center gap-1">
              {nodeState.status === 'running' && (
                <Loader size={16} className="animate-spin text-blue-500" />
              )}
              {nodeState.status === 'completed' && (
                <CheckCircle size={16} className="text-green-500" />
              )}
              {nodeState.status === 'error' && (
                <AlertCircle size={16} className="text-red-500" />
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">{node.id}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Section */}
        {nodeState ? (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Execution Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${nodeState.status === 'completed' ? 'text-green-600' :
                  nodeState.status === 'error' ? 'text-red-600' :
                    nodeState.status === 'running' ? 'text-blue-600' :
                      'text-gray-600'
                  }`}>
                  {nodeState.status.charAt(0).toUpperCase() + nodeState.status.slice(1)}
                </span>
              </div>
              {formattedTime ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-gray-700 font-mono text-xs">{formattedTime}</span>
                </div>
              ) : null}
              {duration ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="text-gray-700 font-mono">{duration}s</span>
                </div>
              ) : null}
              {nodeState.progress !== undefined && nodeState.progress < 100 ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Progress:</span>
                  <div className="w-20 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${nodeState.progress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Error Section */}
        {nodeState?.error && nodeState.status === 'error' ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error</h3>
              </div>
            </div>
            <p className="text-xs text-red-700 font-mono bg-red-100 rounded p-2 max-h-24 overflow-y-auto">
              {typeof nodeState.error === 'string' ? nodeState.error : String(nodeState.error)}
            </p>
            {nodeState.errorStack ? (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
                  Stack trace
                </summary>
                <pre className="text-xs text-red-700 bg-red-100 rounded p-2 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {typeof nodeState.errorStack === 'string' ? nodeState.errorStack : String(nodeState.errorStack)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}

        {/* Result Section */}
        {nodeState?.result && nodeState.status === 'completed' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Result</h3>
            <pre className="text-xs text-green-700 bg-green-100 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(nodeState.result, null, 2)}
            </pre>
          </div>
        ) : null}

        {/* Logs Section */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Logs</h3>
            {nodeState?.logs && nodeState.logs.length > 0 ? (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                {nodeState.logs.length}
              </span>
            ) : null}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono bg-gray-900 text-gray-100 rounded p-2">
            {nodeState?.logs && nodeState.logs.length > 0 ? (
              nodeState.logs.map((log, idx) => (
                <div key={idx} className="text-gray-300">
                  <span className="text-gray-500">[{idx + 1}]</span> {log}
                </div>
              ))
            ) : logs && logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="text-gray-300">
                  <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                  <span className={log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-green-400'}>
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No logs available</div>
            )}
          </div>
        </div>

        {/* Node Configuration */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Configuration</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600">Type</label>
              <p className="mt-1 text-sm text-gray-700 bg-gray-50 rounded px-2 py-1">{node.type}</p>
            </div>
          </div>
        </div>

        {/* Node-specific Properties */}
        <>{nodePropertiesMap[node.type as keyof typeof nodeTypes]}</>
      </div>
    </div>
  );
}
