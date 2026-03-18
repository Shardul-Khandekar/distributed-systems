import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def fetch_products(connection_url, branch_label):
    try:
        # Connect to the database
        conn = psycopg2.connect(connection_url)
        cursor = conn.cursor()

        # Execute the query to fetch products for the specified branch
        query = "SELECT * FROM products"
        cursor.execute(query)

        # Fetch all results
        products = cursor.fetchall()
        
        # Print the products
        print(f"Products in branch '{branch_label}':")
        for product in products:
            print(product)

    except Exception as e:
        print(f"Error fetching products: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    fetch_products(os.getenv("NEON_MAIN_URL"), "production")
    fetch_products(os.getenv("NEON_DEV_URL"), "dev")
