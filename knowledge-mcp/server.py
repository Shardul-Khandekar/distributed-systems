from mcp.server.fastmcp import FastMCP
import json, os, uuid
from datetime import datetime

mcp = FastMCP("Personal Knowledge Base")

NOTES_FILE = "notes.json"

def load_notes():
    if not os.path.exists(NOTES_FILE):
        return {}
    with open(NOTES_FILE, "r") as f:
        return json.load(f)
    
def save_notes(notes):
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=2)