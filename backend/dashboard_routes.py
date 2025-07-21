import os
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from collections import Counter

# --- Custom Utility Import ---
from utils import get_rich_context, get_appwrite_client

# --- LangChain Imports ---
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

# --- Router Initialization ---
router = APIRouter()

# --- AI Model Configuration ---
try:
    groq_model = ChatGroq(model='gemma2-9b-it', temperature=0.7)
except Exception as e:
    print(f"Error during Groq configuration in dashboard routes: {e}")
    groq_model = None

# --- Pydantic Models for Structured Output ---
class AISummary(BaseModel):
    focus: str = Field(description="A concise, actionable focus for the week. Should be 1-2 sentences.")
    opportunity: str = Field(description="A key product or category opportunity to capitalize on. 1-2 sentences.")
    caution: str = Field(description="A key product or category to be cautious about. 1-2 sentences.")
    action: str = Field(description="A single, clear, actionable next step for the seller. 1 sentence.")

class KpiCard(BaseModel):
    title: str
    value: str
    change: Optional[str] = None
    trend: str
    icon: str
    subtitle: Optional[str] = None

class ProductDetail(BaseModel):
    label: str
    value: int

class TopSellingItem(BaseModel):
    name: str
    quantity: int
    icon: str

class Order(BaseModel):
    id: str
    description: str
    amount: float
    status: str
    platform: Optional[str] = None
    order_date: Optional[str] = None

DB_ID = os.getenv("VITE_APPWRITE_DB_ID")
PURCHASE_ORDERS_COLLECTION_ID = os.getenv("VITE_APPWRITE_PURCHASE_ORDERS_ID")
SALES_ORDERS_COLLECTION_ID = os.getenv("VITE_APPWRITE_SALES_ORDERS_ID")
PRODUCTS_COLLECTION_ID = os.getenv("VITE_APPWRITE_COLLECTION_ID")

# --- API Endpoint for AI Summary ---
@router.post("/summary", response_model=AISummary)
async def get_ai_dashboard_summary(
    products: List[Dict[str, Any]] = Body(...),
    pincode: str = Body(...)
):
    if not groq_model:
        raise HTTPException(status_code=500, detail="AI model is not configured.")

    # 1. Get the rich context
    rich_context = get_rich_context(products=products, pincode=pincode)

    # 2. Set up the Pydantic parser
    parser = PydanticOutputParser(pydantic_object=AISummary)

    # 3. Create the prompt template
    prompt_template = """
    You are an expert e-commerce analyst for sellers in India. Your task is to provide a brief, actionable weekly summary based on the provided context.

    **Analyze the following context:**
    {context}

    **Your Instructions:**
    -  Keep the tone encouraging and direct.
    -  Base your analysis strictly on the provided product inventory, local weather, and upcoming festivals.
    -  Do not make up information. If the context is sparse, provide general advice.
    -  Generate a summary in the following JSON format:

    {format_instructions}

    **RESPONSE:**
    """
    prompt = ChatPromptTemplate.from_template(
        template=prompt_template,
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    # 4. Create the chain and invoke
    chain = prompt | groq_model | parser

    try:
        summary_response = await chain.ainvoke({"context": rich_context})
        return summary_response
    except Exception as e:
        print(f"Error invoking AI chain for summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI summary. Error: {str(e)}")

@router.get("/kpis", response_model=List[KpiCard])
async def get_kpis():
    # This data will be calculated dynamically in a future step
    return []

@router.get("/product-details", response_model=List[ProductDetail])
async def get_product_details():
    try:
        db = get_appwrite_client()
        response = db.list_documents(
            database_id=DB_ID,
            collection_id=PRODUCTS_COLLECTION_ID
        )
        products = response['documents']

        low_stock_items = sum(1 for p in products if p.get('stock', 0) < 10)
        all_item_groups = len(set(p.get('category') for p in products if p.get('category')))
        all_items = len(products)

        return [
            {"label": "Low Stock Items", "value": low_stock_items},
            {"label": "All Item Groups", "value": all_item_groups},
            {"label": "All Items", "value": all_items},
            {"label": "Unconfirmed Items", "value": 0} # This remains static for now
        ]
    except Exception as e:
        print(f"Error fetching product details from Appwrite: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch product details.")

@router.get("/top-selling-items", response_model=List[TopSellingItem])
async def get_top_selling_items():
    try:
        db = get_appwrite_client()
        response = db.list_documents(
            database_id=DB_ID,
            collection_id=SALES_ORDERS_COLLECTION_ID
        )
        sales = response['documents']
        
        # Count occurrences of each product description
        item_counts = Counter(s['description'] for s in sales)
        
        # Get the top 4 most common items
        top_items = item_counts.most_common(4)
        
        return [
            TopSellingItem(
                name=item,
                quantity=count,
                icon="Package" # Default icon
            ) for item, count in top_items
        ]
    except Exception as e:
        print(f"Error fetching top selling items from Appwrite: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch top selling items.")

@router.get("/purchase-orders", response_model=List[Order])
async def get_purchase_orders():
    try:
        db = get_appwrite_client()
        response = db.list_documents(
            database_id=DB_ID,
            collection_id=PURCHASE_ORDERS_COLLECTION_ID
        )
        # The 'id' in our Pydantic model conflicts with Appwrite's '$id'.
        # We need to map the response to our model correctly.
        orders = [
            Order(
                id=doc['order_id'], # Use our defined 'order_id'
                description=doc['description'],
                amount=doc['amount'],
                status=doc['status']
            ) for doc in response['documents']
        ]
        return orders
    except Exception as e:
        print(f"Error fetching purchase orders from Appwrite: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch purchase orders.")


@router.get("/sales-orders", response_model=List[Order])
async def get_sales_orders():
    try:
        db = get_appwrite_client()
        response = db.list_documents(
            database_id=DB_ID,
            collection_id=SALES_ORDERS_COLLECTION_ID
        )
        orders = [
            Order(
                id=doc['order_id'],
                description=doc['description'],
                amount=doc['amount'],
                status=doc['status'],
                platform=doc.get('platform'),
                order_date=doc.get('order_date')
            ) for doc in response['documents']
        ]
        return orders
    except Exception as e:
        print(f"Error fetching sales orders from Appwrite: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales orders.") 