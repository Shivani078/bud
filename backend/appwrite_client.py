import os
from appwrite.client import Client
from appwrite.services.databases import Databases
from dotenv import load_dotenv

load_dotenv()

# --- Appwrite Configuration ---
# Fetches all necessary Appwrite credentials and IDs from environment variables.
ENDPOINT = os.getenv("VITE_APPWRITE_ENDPOINT")
PROJECT_ID = os.getenv("VITE_APPWRITE_PROJECT_ID")
API_KEY = os.getenv("VITE_APPWRITE_API_KEY")
DB_ID = os.getenv("VITE_APPWRITE_DB_ID")
PRODUCTS_COLLECTION_ID = os.getenv("VITE_APPWRITE_COLLECTION_ID")
PURCHASE_ORDERS_COLLECTION_ID = os.getenv("VITE_APPWRITE_PURCHASE_ORDERS_ID")
SALES_ORDERS_COLLECTION_ID = os.getenv("VITE_APPWRITE_SALES_ORDERS_ID")

# --- Singleton Client Initialization ---
# These variables hold the singleton instances of the client and database service.
_client = None
_db = None

def get_db_service():
    """
    Initializes and returns a singleton instance of the Appwrite Databases service.
    This ensures we don't create a new connection for every API call.
    """
    global _client, _db
    if _db is None:
        # Validate that all required environment variables are present.
        if not all([ENDPOINT, PROJECT_ID, API_KEY, DB_ID]):
            raise ValueError("Missing critical Appwrite environment variables.")
        
        _client = Client()
        _client.set_endpoint(ENDPOINT).set_project(PROJECT_ID).set_key(API_KEY)
        _db = Databases(_client)
    return _db 