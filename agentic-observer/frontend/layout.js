export const mainLayout = {

    id: "observer-surface",
    type: "surface",
    layout: {
        type: "vbox", // Vertical Box layout
        children: [
            // Constant Header area
            {
                id: "header-area",
                type: "text",
                value: "AI Agent Thought Stream",
                style: { fontSize: "24px", padding: "10px" }
            },
            // Dynamic Thought Stream area
            {
                id: "task-grid",
                type: "grid",
                // Bind operation connects UI to data path
                bind: "agent_tasks",
                config: {
                    columns: 3,
                    gutter: 15,
                    itemType: "TaskCardComponent"
                }
            }
        ]
    }
}