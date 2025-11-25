import { useShallow } from "zustand/react/shallow";
import useStore from "@/app/store/workflowStore";
import { AppState } from "@/app/types/store";

const workflowSelector = (state: AppState) => ({
    nodes: state.nodes,
    edges: state.edges,
    selectedNode: state.selectedNode,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    setSelectedNode: state.setSelectedNode,
});

export function useWorkflowStore() {
    return useStore(useShallow(workflowSelector));
}
