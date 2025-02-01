from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import logging
from redis_manager import get_city_data, get_dst_data, redis_client
import asyncio
from routes.time_routes import calculate_city_time

# Initialize FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('main.log'),  # Log to a file
        logging.StreamHandler()  # Log to the terminal
    ]
)

@app.get("/location/{city_name}")
async def get_location_time(city_name: str):
    try:
        # Try to get data with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                city_data = await get_city_data(city_name)
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(1)  # Wait before retrying
        if not city_data:
            raise HTTPException(
                status_code=404, 
                detail={"message": "City not found", "city": city_name}
            )
        
        dst_data = await get_dst_data(city_name)
        if not dst_data:
            logging.warning(f"DST data not found for {city_name}")
            
        if dst_data:
            city_data['dst_data'] = dst_data
        
        time_info = calculate_city_time(city_data)
        return time_info
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing request for {city_name}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={"message": "Internal server error", "error": str(e)}
        )
    except Exception as e:
        logging.error(f"Error processing request for {city_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search")
async def search_cities(query: str):
    """Search for cities with case-insensitive matching."""
    try:
        print(f"\n🔎 Search request received for: '{query}'")
        
        # Only search if query is 3 or more characters
        if len(query.strip()) < 3:
            print("⚠️ Query too short (min 3 characters)")
            return []
            
        query = query.lower().strip()
        matches = []
        
        # Get all city keys from Redis
        city_keys = await redis_client.hkeys('cities')
        print(f"📚 Scanning through {len(city_keys)} cities")
        
        # Search through cities
        for city_key in city_keys:
            city_key = city_key.decode('utf-8')
            # Get the city data directly without using it as a search key
            city_data = await redis_client.hget('cities', city_key)  # Use the actual city key
            
            if city_data:
                try:
                    city = json.loads(city_data.decode('utf-8'))
                    
                    # Check if query matches any field
                    search_fields = [
                        city['city'].lower().strip(),
                        city.get('state', '').lower().strip(),
                        city.get('country', '').lower().strip()
                    ]
                    
                    # Match if any field starts with the query
                    if any(field.startswith(query) for field in search_fields):
                        print(f"✅ Match found: {city['city']}, {city.get('state', '')}, {city['country']}")
                        matches.append({
                            'id': city.get('id', ''),
                            'city': city['city'],
                            'state': city.get('state', ''),
                            'country': city['country'],
                            'timezone': city['timezone'],
                            'coordinates': city['coordinates']
                        })
                except json.JSONDecodeError as e:
                    print(f"JSON decode error for city {city_key}: {e}")
                    continue
                except Exception as e:
                    print(f"Unexpected error processing city {city_key}: {e}")
                    continue
        
        if not matches:
            print("❌ No matches found")
            return []
            
        print(f"🎯 Found {len(matches[:5])} matches")
        return matches[:5]  # Return top 5 results
        
    except Exception as e:
        print(f"💥 Search error: {str(e)}")
        logging.error(f"Error searching for cities: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail={"message": "Error searching cities", "error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    logging.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
