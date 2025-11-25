import { ApiNode } from "./apiNode";
import { StartNode } from "./startNode";
import { ResultNode } from "./resultNode";

export const nodeTypes = {
    start: StartNode,
    api: ApiNode,
    result: ResultNode,
};
