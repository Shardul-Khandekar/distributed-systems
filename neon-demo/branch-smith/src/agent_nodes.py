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

def create_branch_node(state: AgentState) -> dict:
    """
        Spin up a fresh Neon branch for the migration attempt
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