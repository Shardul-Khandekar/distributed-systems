"""
    Neon REST API client for branch-smith
    Handles branch lifecycle: create, list, delete, and connection string retrieval.

    API docs: https://api-docs.neon.tech/reference/
"""

import os
import time
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Constants for Neon API
NEON_API_BASE = "https://console.neon.tech/api/v2"
API_KEY = os.getenv("NEON_API_KEY")
PROJECT_ID = os.getenv("NEON_PROJECT_ID")

if not API_KEY or not PROJECT_ID:
    raise EnvironmentError(
        "Missing NEON_API_KEY or NEON_PROJECT_ID in .env file."
    )

# Set API headers
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

def _request(method, path, json_body=None):
    """
        Internal helper: makes an authenticated request and raises on error
    """

    url = f"{NEON_API_BASE}{path}"
    response = requests.request(method, url, headers=HEADERS, json=json_body)

    if not response.ok:
        raise RuntimeError(
            f"Neon API error {response.status_code} on {method} {path}: {response.text}"
        )
    
    return response.json() if response.content else {}

def list_branches():
    """
        Return a list of all branches in the project
    """

    data = _request("GET", f"/projects/{PROJECT_ID}/branches")
    return data.get("branches", [])

def get_branch_by_name(name):
    """
        Find a branch by name. Returns None if not found.
    """
    for branch in list_branches():
        if branch.get("name") == name:
            return branch
    
    return None

def create_branch(name, parent_branch_name="production"):
    """
        Creates a new branch off the specified parent and returns branch metadata dict
    """
    parent = get_branch_by_name(parent_branch_name)

    if not parent:
        raise ValueError(f"Parent branch '{parent_branch_name}' not found")
    
    body = {
        "branch": {
            "name": name,
            "parent_id": parent["id"],
        },
        "endpoints": [
            {"type": "read_write"}  # attach a compute endpoint
        ],
    }

    data = _request("POST", f"/projects/{PROJECT_ID}/branches", json_body=body)

    print(f"Created branch '{name}' (id: {data['branch']['id']})")
    return data

def delete_branch(name):
    """
        Delete a branch by name. Refuses to delete 'main' as a safety check
    """

    if name == "main":
        raise ValueError("Cannot delete 'main' branch")
    
    branch = get_branch_by_name(name)
    if not branch:
        print(f"Branch '{name}' not found, nothing to delete.")
        return
    
    _request("DELETE", f"/projects/{PROJECT_ID}/branches/{branch['id']}")
    print(f"Deleted branch '{name}' (id: {branch['id']})")

