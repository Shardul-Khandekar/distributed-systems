import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from agent_graph import build_graph
import neon_client

def main():
    print("=" * 50)
    print("branch-smith: AI-powered Postgres schema migration agent")
    print("=" * 50)

    print("\nDescribe the schema change you want to make.")
    print("Example: 'Add a discount_percentage column to products with default 0'")
    print()

    user_request = input("Migration request: ").strip()
    if not user_request:
        print("No request provided. Exiting.")
        return
    
    graph = build_graph()
    final_state = graph.invoke({"user_request": user_request})

    # Approval step
    print("\nProposed migration SQL:")
    decision = input("Approve this migration? [y/N]: ").strip().lower()
    if decision == "y":
        print("\n[Phase 4 will handle merging to main. For now, branch is preserved for inspection.]")
        print(f"Branch '{final_state['branch_name']}' kept for review.")
    else:
        print(f"\nDiscarding branch '{final_state['branch_name']}'...")
        neon_client.delete_branch(final_state["branch_name"])
        print("Branch deleted.")

if __name__ == "__main__":
    main()