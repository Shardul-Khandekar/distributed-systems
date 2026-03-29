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

# Tools
# The docstring becomes the tool description that is being used by LLM during discovery

@mcp.tool()
def save_note(title: str, content: str, tags: list[str] = []) -> str:
    """Save a new note to the knowledge base with optional tags."""
    notes = load_notes()
    note_id = str(uuid.uuid4())[:8]
    notes[note_id] = {
        "id": note_id,
        "title": title,
        "content": content,
        "tags": tags,
        "links": [],
        "created_at": datetime.now().isoformat()
    }
    save_notes(notes)
    return f"Note saved with ID: {note_id}"

@mcp.tool()
def search_notes(query: str) -> str:
    """Search notes by keyword across title, content, and tags."""
    notes = load_notes()
    results = []
    q = query.lower()
    for note in notes.values():
        if (q in note["title"].lower() or
            q in note["content"].lower() or
            any(q in tag.lower() for tag in note["tags"])):
            results.append(f"[{note['id']}] {note['title']}: {note['content'][:100]}...")
    return "\n".join(results) if results else "No notes found."

@mcp.tool()
def link_concepts(note_id_1: str, note_id_2: str) -> str:
    """Link two notes together as related concepts (bidirectional)."""
    notes = load_notes()
    if note_id_1 not in notes or note_id_2 not in notes:
        return "One or both note IDs not found."
    notes[note_id_1]["links"].append(note_id_2)
    notes[note_id_2]["links"].append(note_id_1)
    save_notes(notes)
    return f"Linked '{notes[note_id_1]['title']}' ↔ '{notes[note_id_2]['title']}'"

@mcp.tool()
def delete_note(note_id: str) -> str:
    """Delete a note permanently by its ID."""
    notes = load_notes()
    if note_id not in notes:
        return "Note not found."
    title = notes[note_id]["title"]
    del notes[note_id]
    save_notes(notes)
    return f"Deleted: {title}"