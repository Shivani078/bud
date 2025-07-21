from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()

class ReturnItem(BaseModel):
    description: str
    return_reason: str

class AIInsightResponse(BaseModel):
    insight: str

@router.post("/analyze", response_model=AIInsightResponse)
async def analyze_returns(returned_items: List[ReturnItem] = Body(...)):
    """
    Analyzes a list of returned items to find patterns and suggest improvements.
    """
    try:
        model = ChatGroq(model="gemma2-9b-it", temperature=0.7)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI model could not be configured: {e}")

    if not returned_items:
        return AIInsightResponse(insight="There are no returned items to analyze.")

    # Format the returns data for the prompt
    formatted_returns = "\n".join([f"- Product: '{item.description}', Reason: '{item.return_reason}'" for item in returned_items])

    prompt = ChatPromptTemplate.from_template(
        """
        You are an expert e-commerce analyst. I will provide you with a list of recently returned products and the reasons for their return.
        Your task is to identify any patterns and provide a single, concise, and actionable piece of advice for the seller to reduce their return rate.

        Here is the list of returns:
        {returns_data}

        Analyze these returns and provide one key insight. For example, if you see multiple returns for 'Wrong Size' for the same product, suggest adding a size chart.
        If you see 'Damaged in Transit', suggest improving packaging. The advice should be direct and easy to implement.

        Respond with only the actionable advice.
        """
    )

    chain = prompt | model | StrOutputParser()

    try:
        insight = await chain.ainvoke({"returns_data": formatted_returns})
        return AIInsightResponse(insight=insight)
    except Exception as e:
        print(f"Error generating AI insight for returns: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI insight.") 