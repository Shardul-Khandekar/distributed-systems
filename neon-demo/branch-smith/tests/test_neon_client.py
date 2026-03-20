"""
    python3.12 tests/test_neon_client.py
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import neon_client

def main():

    test_branch_name = "smoke-test-branch"

    print("=" * 50)
    print("STEP 1: List existing branches")
    branches = neon_client.list_branches()
    for branch in branches:
        print(f" - {branch['name']} (id: {branch['id']})")

    print("\n" + "=" * 50)
    print(f"STEP 2: Create a new branch '{test_branch_name}'")
    result = neon_client.create_branch(test_branch_name)
    print("\nRaw response from create_branch:\n")
    print(json.dumps(result, indent=2, default=str))

    print("\n" + "=" * 50)
    print(f"STEP 3: Verify the new branch '{test_branch_name}' exists")
    branch = neon_client.get_branch_by_name(test_branch_name)
    if branch:
        print(f"Branch '{test_branch_name}' found with ID: {branch['id']}")

    print("\n" + "=" * 50)
    print(f"STEP 4: Delete the branch '{test_branch_name}'")
    neon_client.delete_branch(test_branch_name)
    print(f"Branch '{test_branch_name}' deleted.")

if __name__ == "__main__":
    main()