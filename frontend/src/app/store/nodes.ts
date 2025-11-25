import { AppNode } from "../types/store";

export const initialNodes = [
    {
        id: "1",
        type: "start",
        data: { label: "Start Node" },
        position: { x: 0, y: 250 },
    },

    {
        id: "2",
        type: "api",
        data: { label: "Api Node" },
        position: { x: 125, y: 250 },
    },

    {
        id: "3",
        type: "api",
        data: { label: "Api Node" },
        position: { x: 325, y: 250 },
    },
    {
        id: "4",
        type: "result",
        data: { label: "Result Node" },
        position: { x: 525, y: 250 },
    },
] as AppNode[];
