"""
Schema introspection for branch-smith.
Reads the structure of a Postgres database (tables, columns, types, constraints)
and returns it as a structured dict suitable for feeding to an LLM.
"""

import psycopg2
from psycopg2.extras import RealDictCursor

def _list_tables(cur, schema_name):
    """
        Return table names in the schema (excluding views and system tables).
    """
    
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """,
        (schema_name,),
    )
    
    return [row["table_name"] for row in cur.fetchall()]

def _list_columns(cur, schema_name, table_name):
    """
        Return column metadata for a single table.
    """
    cur.execute(
        """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position;
        """,
        (schema_name, table_name),
    )
    return [
        {
            "name": row["column_name"],
            "type": row["data_type"],
            "nullable": row["is_nullable"] == "YES",
            "default": row["column_default"],
        }
        for row in cur.fetchall()
    ]

def _list_primary_key(cur, schema_name, table_name):
    """
        Return the list of column names making up the primary key (or [] if none).
    """

    cur.execute(
        """
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = %s
          AND tc.table_name = %s
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
        """,
        (schema_name, table_name),
    )

    return [row["column_name"] for row in cur.fetchall()]

def get_schema(connection_url, schema_name="public"):
    """
    Return a structured representation of the given schema.
    
    Output shape:
    {
        "schema": "public",
        "tables": [
            {
                "name": "products",
                "columns": [
                    {"name": "id", "type": "integer", "nullable": False, "default": "nextval(...)"},
                    {"name": "name", "type": "text", "nullable": False, "default": None},
                    ...
                ],
                "primary_key": ["id"],
            },
            ...
        ]
    }
    """

    with psycopg2.connect(connection_url) as conn:
        # Use RealDictCursor to get dict results instead of tuples
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            tables = _list_tables(cur, schema_name)
            result = {"schema": schema_name, "tables": []}
            for table_name in tables:
                result["tables"].append({
                    "name": table_name,
                    "columns": _list_columns(cur, schema_name, table_name),
                    "primary_key": _list_primary_key(cur, schema_name, table_name),
                })

            return result