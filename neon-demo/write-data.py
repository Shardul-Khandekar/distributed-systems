import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_connection(branch_label):
    """
    Returns a connection to the specified branch.
    """
    url = os.getenv(f"NEON_{branch_label.upper()}_URL")

    if not url:
        raise ValueError(f"No connection URL found for branch: {branch_label}")
    
    return psycopg2.connect(url)

def insert_product(branch_label, name, price, stock):
    """
    Insert a new product into the given branch.
    """
    with get_connection(branch_label) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO products (name, price, stock) VALUES (%s, %s, %s) RETURNING id;",
                (name, price, stock)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            print(f"[{branch_label}] Inserted '{name}' with id={new_id}")
            return new_id

def fetch_products(branch_label):
    """
    Read all products from the given branch
    """
    with get_connection(branch_label) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, price, stock FROM products;")
            products = cur.fetchall()
            print(f"Products in branch '{branch_label}':")
            for product in products:
                print(product)

if __name__ == "__main__":
    # Snapshot before inserting new product
    print("=" * 50)
    fetch_products("MAIN")
    print("=" * 50)
    fetch_products("DEV")

    # Insert a new product into the dev branch
    insert_product("DEV", "USB Hub", 35.00, 120)

    # Snapshot after inserting new product
    print("=" * 50)
    fetch_products("MAIN")
    print("=" * 50)
    fetch_products("DEV")