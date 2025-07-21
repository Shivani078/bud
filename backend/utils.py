import json
import calendar
from datetime import datetime, timedelta
from indian_festivals.festival import IndianFestivals
import os
import requests

def _get_raw_upcoming_festivals():
    """
    Fetches raw festival data from the library, handling the year-end case.
    Returns a list of festival dictionaries.
    """
    today = datetime.now()
    all_festivals = []

    # Fetch for the current year and the next to handle the year-end boundary smoothly
    for year_offset in range(2):
        year_to_fetch = today.year + year_offset
        try:
            fest_finder = IndianFestivals(str(year_to_fetch))
            # The library can return a string or a dict, so handle both cases
            festivals_str = fest_finder.get_festivals_in_a_year()
            festivals_by_month = json.loads(festivals_str) if isinstance(festivals_str, str) else festivals_str
            
            month_map = {name: num for num, name in enumerate(calendar.month_name) if num}

            for month_name, festivals in festivals_by_month.items():
                month_number = month_map.get(month_name)
                if not month_number:
                    continue

                for festival in festivals:
                    try:
                        festival_date = datetime(year_to_fetch, month_number, int(festival['date']))
                        all_festivals.append({"name": festival.get('name', 'Unknown Festival'), "date": festival_date})
                    except (ValueError, KeyError, TypeError):
                        continue # Ignore malformed festival entries
        except Exception as e:
            print(f"Warning: Could not fetch or parse festival data for year {year_to_fetch}. Error: {e}")
            continue
    
    # Filter for festivals in the next 90 days and sort them
    upcoming = [f for f in all_festivals if today <= f["date"] <= today + timedelta(days=90)]
    upcoming.sort(key=lambda x: x['date'])
    return upcoming

def _get_weather_for_pincode(pincode: str):
    """
    Fetches weather for a given Indian pincode.
    Returns a tuple of (season, weather_summary_string).
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key or not pincode:
        return "Season data is unavailable", "Weather data is unavailable"

    # Determine season based on month
    month = datetime.now().month
    season = "Post-Monsoon (Autumn)"
    if month in [12, 1, 2]: season = "Winter"
    elif month in [3, 4, 5]: season = "Summer"
    elif month in [6, 7, 8, 9]: season = "Monsoon"

    try:
        # 1. Convert pincode to lat/lon using OpenWeatherMap's Geocoding API
        geo_url = f"http://api.openweathermap.org/geo/1.0/zip?zip={pincode},IN&appid={api_key}"
        geo_res = requests.get(geo_url)
        geo_res.raise_for_status()
        geo_data = geo_res.json()
        lat, lon = geo_data['lat'], geo_data['lon']
        city_name = geo_data.get('name', 'your area')

        # 2. Fetch weather using the coordinates
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        weather_res = requests.get(weather_url)
        weather_res.raise_for_status()
        weather_data = weather_res.json()
        
        description = weather_data['weather'][0]['description']
        temp = weather_data['main']['temp']
        weather_summary = f"Current weather in {city_name} ({pincode}): {description} with a temperature of {temp}°C."
        return season, weather_summary
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data for pincode {pincode}: {e}")
        return season, "Could not retrieve local weather data."
    except (KeyError, IndexError):
        print(f"Error parsing weather or geo data for pincode {pincode}.")
        return season, "Could not parse local weather data."

def _format_product_data_for_prompt(products):
    """Formats a list of product dictionaries into a string for AI prompts."""
    if not products:
        return "The user has no products in their inventory."
    
    product_lines = []
    for p in products:
        product_lines.append(f"- Name: {p.get('name', 'N/A')}, Category: {p.get('category', 'N/A')}, Price: {p.get('price', 'N/A')}, Stock: {p.get('stock', 'N/A')}")
    return "Current Product Inventory:\n" + "\n".join(product_lines)

def get_rich_context(products: list, pincode: str):
    """
    Gathers and formats all available context (festivals, weather, products)
    into a single string for AI prompts.
    """
    # 1. Get festivals
    festivals = _get_raw_upcoming_festivals()
    festival_str = "Upcoming Festivals (next 90 days):\n"
    if festivals:
        festival_str += "\n".join([f"- {f['name']} on {f['date'].strftime('%B %d, %Y')}" for f in festivals])
    else:
        festival_str += "No major festivals in the next 90 days."
    
    # 2. Get weather
    season, weather = _get_weather_for_pincode(pincode)
    weather_str = f"Current Season & Weather:\nIt is currently {season} in India. {weather}"

    # 3. Get products
    product_str = _format_product_data_for_prompt(products)

    # Combine all context into one string
    full_context = f"--- START CONTEXT ---\n\n{weather_str}\n\n{product_str}\n\n{festival_str}\n\n--- END CONTEXT ---"
    
    return full_context

def get_upcoming_festivals_for_prompt():
    """Formats upcoming festivals as a comma-separated string for the planner's AI prompt."""
    upcoming_festivals = _get_raw_upcoming_festivals()
    if not upcoming_festivals:
        return "No major festivals in the next few months."
    
    # Return up to 15 festivals for the prompt
    return ", ".join([f"{f['name']} ({f['date'].strftime('%Y-%m-%d')})" for f in upcoming_festivals[:15]])

def get_upcoming_festivals_for_chat():
    """Formats upcoming festivals as a newline-separated string for the chat's context."""
    upcoming_festivals = _get_raw_upcoming_festivals()
    if not upcoming_festivals:
        return "No major festivals in the next 90 days."

    return "\n".join([f"- {f['name']} on {f['date'].strftime('%B %d, %Y')}" for f in upcoming_festivals]) 