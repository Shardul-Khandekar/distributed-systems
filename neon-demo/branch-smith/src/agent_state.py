from typing import TypedDict, Optional, Any

# Typed dict with total false means all fields are optional, but the ones set should be of the specified type
class AgentState(TypedDict, total=False):
    # Input
    user_request: str

    # Set by create_branch_node
    branch_id: str
    branch_name: str
    connection_url: str

    # Set by introspect_node and again by validate_node
    schema_before: dict
    schema_after: dict

    # Set by generate_sql_node
    migration_sql: str
    sql_explanation: str

    # Set by execute_node
    execution_success: bool
    execution_error: Optional[str]

    # Set by validate_node
    validation_passed: bool
    validation_notes: str

    # Set by present_node, then by user
    diff_summary: str
    user_approved: Optional[bool]