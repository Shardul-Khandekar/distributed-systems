from langgraph.graph import StateGraph, END
from agent_state import AgentState
from agent_nodes import (
    create_branch_node,
    introspect_node,
    generate_sql_node,
    execute_node,
    validate_node,
    present_node,
)

def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("create_branch", create_branch_node)
    graph.add_node("introspect", introspect_node)
    graph.add_node("generate_sql", generate_sql_node)
    graph.add_node("execute", execute_node)
    graph.add_node("validate", validate_node)
    graph.add_node("present", present_node)

    graph.set_entry_point("create_branch")
    graph.add_edge("create_branch", "introspect")
    graph.add_edge("introspect", "generate_sql")
    graph.add_edge("generate_sql", "execute")
    graph.add_edge("execute", "validate")
    graph.add_edge("validate", "present")
    graph.add_edge("present", END)

    return graph.compile()