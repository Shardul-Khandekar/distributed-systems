import os
import json
from datetime import datetime
import psycopg2
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

import neon_client
import schema_inspector
from agent_state import AgentState

# LLM configuration
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,             # deterministic for SQL generation
    api_key=os.getenv("OPENAI_API_KEY"),
)

# Create branch node
def create_branch_node(state: AgentState) -> dict:
    """
        Spin up a fresh Neon branch for the migration attempt.
    """
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    branch_name = f"agent-migration-{timestamp}"

    print(f"\n[create_branch] Creating branch '{branch_name}'")
    branch = neon_client.create_branch(branch_name)
    print(f"[create_branch] Done. Branch id: {branch['id']}")

    return {
        "branch_id": branch["id"],
        "branch_name": branch["name"],
        "connection_url": branch["connection_url"],
    }

# Inspect schema node
def introspect_node(state: AgentState) -> dict:
    """
        Read the current schema on the branch before any changes.
    """
    print("\n[introspect] Reading current schema")
    schema = schema_inspector.get_schema(state["connection_url"])
    print(f"[introspect] Found {len(schema['tables'])} table(s).")
    return {"schema_before": schema}

# Generate SQL node
GENERATE_SQL_SYSTEM_PROMPT = """
    You are a careful PostgreSQL migration assistant.

    You will be given:
    1. The current schema of a database (as JSON)
    2. A natural-language description of a desired migration

    Your job is to produce ONLY the SQL needed to perform the migration, plus a one-paragraph explanation.

    Rules:
    - Output valid PostgreSQL SQL only.
    - Use IF NOT EXISTS / IF EXISTS where appropriate to make the migration idempotent.
    - Do not drop tables or columns unless the request explicitly asks for it.
    - If the request is ambiguous, make the safest reasonable interpretation and note your assumption in the explanation.
    - Never include DELETE without a WHERE clause.

    Respond in this exact JSON format:
    {
        "sql": "<the migration SQL, possibly multiple statements separated by semicolons>",
        "explanation": "<one paragraph explaining what the SQL does and why>"
    }

    Do not wrap your response in markdown code fences. Return raw JSON only.
"""

def generate_sql_node(state: AgentState) -> dict:
    """
        Use the LLM to generate migration SQL based on the request and current schema.
    """
    print("\n[generate_sql] Asking LLM to generate migration SQL")

    user_message = f"""Current schema:
        {json.dumps(state['schema_before'], indent=2, default=str)}

        Migration request:
        {state['user_request']}
    """

    response = llm.invoke([
        SystemMessage(content=GENERATE_SQL_SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ])

    parsed = json.loads(response.content)

    print(f"[generate_sql] SQL generated:\n{parsed['sql']}")

    return {
        "migration_sql": parsed["sql"],
        "sql_explanation": parsed["explanation"],
    }

# Execution node
def execute_node(state: AgentState) -> dict:
    """
        Run the migration SQL against the branch.
    """
    print("\n[execute] Running migration SQL on branch")
    try:
        with psycopg2.connect(state["connection_url"]) as conn:
            with conn.cursor() as cur:
                cur.execute(state["migration_sql"])
                conn.commit()
        print("[execute] Migration applied successfully.")
        return {"execution_success": True, "execution_error": None}
    except Exception as e:
        print(f"[execute] Migration FAILED: {e}")
        return {"execution_success": False, "execution_error": str(e)}
    
