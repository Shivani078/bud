import os
import json
import google.generativeai as genai
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from PIL import Image
import io
from dotenv import load_dotenv
from groq import Groq
import asyncio

from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import PydanticOutputParser

load_dotenv()

router = APIRouter()

# API Clients
try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except KeyError:
    pass  # Handled in endpoint

try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except KeyError:
    groq_client = None


# Main Pydantic Models for Structured Output
class SEOContent(BaseModel):
    title: str = Field(description="A catchy, SEO-friendly title for the product (around 60-70 characters).")
    description: str = Field(description="A detailed, engaging, and SEO-optimized product description (2-3 paragraphs). Highlight key features and benefits.")
    tags: List[str] = Field(description="A list of 10-15 relevant tags or keywords for the product.")
    keywords: List[str] = Field(description="A list of 5-7 primary SEO keywords for search engine ranking.")

class WhatsAppContent(BaseModel):
    caption: str = Field(description="A short, engaging caption suitable for a WhatsApp status or message. Should include 1-2 relevant emojis.")
    promotional_message: str = Field(description="A slightly longer promotional message for WhatsApp, highlighting a key feature and a call-to-action.")

class ConversationalContent(BaseModel):
    search_phrases: List[str] = Field(description="A list of 3-5 natural language phrases that a real person would use to search for this product (e.g., 'kurta for summer wedding').")

class GeneratedContent(BaseModel):
    """The final structured output for the product listing."""
    seo_content: Optional[SEOContent] = Field(None, description="Standard SEO-optimized content.")
    whatsapp_content: Optional[WhatsAppContent] = Field(None, description="Content tailored for WhatsApp marketing.")
    conversational_content: Optional[ConversationalContent] = Field(None, description="Natural language phrases for conversational AI.")
    category: str = Field(description="The category of the product.")

# Pydantic models for other endpoints
class ImprovedContent(BaseModel):
    title: str
    description: str

class ImproveListingRequest(BaseModel):
    content: GeneratedContent # The full content object to be improved
    instructions: str # User-provided instructions for improvement

class TranslateRequest(BaseModel):
    content: GeneratedContent
    language: str

class TranslateResponse(BaseModel):
    title: str
    description: str


async def generate_content_part(model, parser_class, prompt_template_str, input_data):
    """A reusable function to generate one part of the content."""
    try:
        parser = PydanticOutputParser(pydantic_object=parser_class)
        prompt = PromptTemplate(
            template=prompt_template_str,
            input_variables=list(input_data.keys()),
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        chain = prompt | model | parser
        return await chain.ainvoke(input_data)
    except Exception as e:
        print(f"--- Failed to generate content for {parser_class.__name__} ---")
        print(f"Error: {e}")
        return None # Return None on failure

# --- Main Endpoint ---
@router.post("/")
async def generate_listing_endpoint(
    description: str = Form(...),
    category: str = Form(...),
    # dialect: str = Form("english"), # Removed
    content_options_str: str = Form('{"seo": true}'),
    image: UploadFile = File(...)
):
    if "GOOGLE_API_KEY" not in os.environ or not os.environ["GOOGLE_API_KEY"]:
        raise HTTPException(status_code=500, detail="Google API key is not configured.")

    # Step 1: Analyze the image with Gemini Vision to get a description
    try:
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        vision_model = genai.GenerativeModel('gemini-1.5-flash')
        image_analysis_prompt = [
            "You are an expert at analyzing product images. Describe the product in the image in detail, "
            "focusing on its visual attributes like color, material, style, design, and any notable features. "
            "This description will be used by another AI to generate a product listing. Be objective and descriptive.",
            pil_image
        ]
        vision_response = await vision_model.generate_content_async(image_analysis_prompt)
        image_description = vision_response.text
    except Exception as e:
        print(f"Error during image analysis with Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze product image.")

    # --- Step 2: Concurrently generate all selected content types ---
    try:
        groq_model = ChatGroq(
            model="gemma2-9b-it",
            temperature=0.4, # Slightly increased for more creative output
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        content_options = json.loads(content_options_str)
        
        tasks = []
        base_input = {
            "user_description": description,
            "image_description": image_description,
            "category": category,
            # "dialect": dialect, # Removed
        }

        # --- SEO Task ---
        if content_options.get('seo'):
            seo_prompt = """You are an expert SEO marketer for the Indian e-commerce market. 
            Based on the user's description and an AI image analysis, create the SEO content in English.
            User's Description: "{user_description}"
            AI's Image Analysis: "{image_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, SEOContent, seo_prompt, base_input))

        # --- WhatsApp Task ---
        if content_options.get('whatsapp'):
            whatsapp_prompt = """You are a creative social media marketer for India. 
            Create a WhatsApp caption and promotional message in English based on the product info. Use 1-2 relevant emojis.
            User's Description: "{user_description}"
            AI's Image Analysis: "{image_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, WhatsAppContent, whatsapp_prompt, base_input))

        # --- Conversational Task ---
        if content_options.get('conversational'):
            conversational_prompt = """You are a conversational AI expert. 
            Write 3-5 natural language search phrases in English that a real person in India would use to find this product.
            User's Description: "{user_description}"
            AI's Image Analysis: "{image_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, ConversationalContent, conversational_prompt, base_input))
        
        # --- Execute all tasks concurrently ---
        results = await asyncio.gather(*tasks)

        # --- Assemble the final response ---
        final_content = GeneratedContent(category=category)
        for result in results:
            if isinstance(result, SEOContent):
                final_content.seo_content = result
            elif isinstance(result, WhatsAppContent):
                final_content.whatsapp_content = result
            elif isinstance(result, ConversationalContent):
                final_content.conversational_content = result
        
        # Ensure at least one content type was generated
        if not final_content.seo_content and not final_content.whatsapp_content and not final_content.conversational_content:
            raise HTTPException(status_code=500, detail="AI failed to generate any content. Please try again.")

        return final_content

    except Exception as e:
        print(f"Error in main generation logic: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate listing content from text.")

# --- Other Endpoints ---
@router.post("/improve", response_model=GeneratedContent)
async def improve_listing_endpoint(request: ImproveListingRequest):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    try:
        # Convert the Pydantic object to a JSON string for the prompt
        content_json_str = request.content.json()
        instructions = request.instructions

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert e-commerce copywriter. Your task is to improve the provided JSON product content based on the user's instructions. "
                        "Make titles more catchy, descriptions more persuasive, and conversational phrases more natural, following the user's guidance. "
                        "Do not alter the JSON structure or keys. Respond ONLY with the improved, valid JSON object."
                    )
                },
                {
                    "role": "user",
                    "content": f"Here is the product content in JSON format:\n{content_json_str}\n\nHere are my instructions for improvement:\n{instructions}"
                }
            ],
            model="gemma2-9b-it",
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        return GeneratedContent.parse_raw(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Error calling Groq API or parsing response for improvement: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to improve listing: {e}")


@router.post("/translate", response_model=GeneratedContent)
async def translate_listing_endpoint(request: TranslateRequest):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")

    content = request.content
    target_language = request.language
    
    # This is a simplified translation. For production, you might run these concurrently.
    try:
        # Translate SEO content
        if content.seo_content:
            seo_title_res = await translate_text(content.seo_content.title, target_language)
            seo_desc_res = await translate_text(content.seo_content.description, target_language)
            content.seo_content.title = seo_title_res
            content.seo_content.description = seo_desc_res
        
        # Translate WhatsApp content
        if content.whatsapp_content:
            wa_caption_res = await translate_text(content.whatsapp_content.caption, target_language)
            wa_promo_res = await translate_text(content.whatsapp_content.promotional_message, target_language)
            content.whatsapp_content.caption = wa_caption_res
            content.whatsapp_content.promotional_message = wa_promo_res

        # Translate Conversational content
        if content.conversational_content:
            translated_phrases = []
            for phrase in content.conversational_content.search_phrases:
                translated_phrases.append(await translate_text(phrase, target_language))
            content.conversational_content.search_phrases = translated_phrases

        return content
    except Exception as e:
        print(f"Error during translation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to translate listing: {e}")

async def translate_text(text: str, language: str) -> str:
    """Helper function to translate a single piece of text using Groq."""
    if not text: return ""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an expert translator. Translate the following text to {language}. Respond only with the translated text, no extra explanation."},
                {"role": "user", "content": text}
            ],
            model="gemma2-9b-it",
            temperature=0.1,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Failed to translate text '{text}' to {language}: {e}")
        return text # Return original text on failure 