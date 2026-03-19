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

