"""
    python3.12 tests/test_schema_inspector.py
"""

import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

import schema_inspector

def main():

    connection_url = os.getenv("NEON_MAIN_URL")

    if not connection_url:
        raise EnvironmentError("NEON_MAIN_URL not set in .env")
    
    print("Inspecting schema on main branch")
    schema = schema_inspector.get_schema(connection_url)
    print(json.dumps(schema, indent=2, default=str))

if __name__ == "__main__":
    main()