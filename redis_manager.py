import os
import json
import logging
import asyncio
from supabase import create_client
from redis.asyncio import Redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Redis setup
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

redis_client = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=0,
    password=REDIS_PASSWORD,
    decode_responses=False,  # Keep responses as bytes
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True
)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('redis_manager.log'),
        logging.StreamHandler()
    ]
)

async def sync_supabase_to_redis():
    """Sync data from Supabase to Redis."""
    try:
        logging.info("Starting Supabase to Redis sync...")
        
        # Sync cities table
        cities_response = supabase.table('cities').select('*').execute()
        if not cities_response.data:
            logging.error("No cities found in Supabase!")
            return
            
        logging.info(f"Found {len(cities_response.data)} cities in Supabase")
        
        for city in cities_response.data:
            if not city.get('city'):
                logging.error(f"Invalid city data: {city}")
                continue
                
            # 1. Store full city data in a hash
            await redis_client.hset(
                'cities:data',  # Main data store
                city['id'],     # Use ID as key instead of city name
                json.dumps(city, ensure_ascii=False)
            )
            
            # 2. Create search indexes
            await redis_client.sadd(
                f'cities:name:{city["city"].lower()}',  # Search by city name
                city['id']
            )
            await redis_client.sadd(
                f'cities:country:{city["country"].lower()}',  # Search by country
                city['id']
            )
            
            # 3. Optional: Create prefix search capability
            for i in range(1, len(city['city'])):
                prefix = city['city'][:i].lower()
                await redis_client.sadd(f'cities:prefix:{prefix}', city['id'])
            
            logging.info(f"Updated city in Redis: {city['city']} ({city.get('country')})")
        
        # Sync dst_offsets table
        dst_offsets_response = supabase.table('dst_offsets').select('*').execute()
        for dst_offset in dst_offsets_response.data:
            # Convert to JSON string with proper encoding
            dst_json = json.dumps(dst_offset, ensure_ascii=False)
            # Store in Redis with utf-8
            await redis_client.hset('dst_offsets', 
                                  dst_offset['city'].encode('utf-8'), 
                                  dst_json.encode('utf-8'))
            logging.info(f"Updated DST offset in Redis: {dst_offset['city']}")
        
        logging.info("Data sync completed successfully")
    except Exception as e:
        logging.error(f"Error syncing data: {str(e)}", exc_info=True)
        raise

async def get_city_data(city_name: str):
    """Get city data from Redis."""
    try:
        print(f"\n📥 Redis Manager: Received request for city: {city_name}")
        
        # Log Redis connection status
        print(f"🔌 Redis connection: {redis_client}")
        
        # 1. Get data from Redis using the city name as key
        print(f"🔍 Attempting Redis HGET on 'cities' with key: {city_name}")
        city_data = await redis_client.hget('cities', city_name.encode('utf-8'))
        
        # Debug: Show all keys in Redis
        all_keys = await redis_client.hkeys('cities')
        print(f"📚 Available keys in Redis: {[key.decode('utf-8') if isinstance(key, bytes) else key for key in all_keys][:5]}... (showing first 5)")
        
        if city_data:
            print(f"✅ Found data in Redis for: {city_name}")
            print(f"📦 Raw Redis data: {city_data}")
            
            # 2. If data exists, decode if needed and parse it
            if isinstance(city_data, bytes):
                decoded_data = city_data.decode('utf-8')
            else:
                decoded_data = city_data
            print(f"🔄 Decoded data: {decoded_data[:100]}...")  # Show first 100 chars
            
            parsed_data = json.loads(decoded_data)
            print(f"📋 Parsed JSON: {json.dumps(parsed_data, indent=2)}\n")
            
            return parsed_data
            
        print(f"❌ No data found in Redis for city: {city_name}")
        print(f"💡 Debug: Key format used: {city_name.encode('utf-8')}\n")
        return None
        
    except Exception as e:
        print(f"💥 Redis Manager Error: {str(e)}")
        print(f"🔍 Debug info:")
        print(f"  - City name: {city_name}")
        print(f"  - Redis client: {redis_client}")
        print(f"  - Error type: {type(e).__name__}\n")
        logging.error(f"Error fetching city data: {str(e)}", exc_info=True)
        return None

async def get_dst_data(city_name: str):
    """Get DST data from Redis."""
    try:
        dst_data = await redis_client.hget('dst_offsets', city_name.encode('utf-8'))
        if dst_data:
            # Decode with utf-8 and parse JSON
            return json.loads(dst_data.decode('utf-8'))
        return None
    except Exception as e:
        logging.error(f"Error fetching DST data: {str(e)}", exc_info=True)
        return None

async def get_all_cities():
    """Get all cities from Redis."""
    try:
        print("\n📥 Redis Manager: Fetching all cities")
        cities = []
        
        # Get all city keys
        city_keys = await redis_client.hkeys('cities')
        print(f"📚 Found {len(city_keys)} cities in Redis")
        
        # Get data for each city
        for city_key in city_keys:
            city_key = city_key.decode('utf-8')
            city = await get_city_data(city_key)
            if city:
                cities.append(city)
                
        return cities
        
    except Exception as e:
        print(f"💥 Redis Manager Error getting all cities: {str(e)}")
        logging.error(f"Error fetching all cities: {str(e)}", exc_info=True)
        return []

async def search_cities_by_prefix(query: str, limit: int = 5):
    """Search cities by prefix using the new Redis structure"""
    try:
        print(f"\n📥 Redis Manager: Searching cities with prefix: {query}")
        matches = []
        query = query.lower().strip()
        
        # Get city IDs that match the prefix
        city_ids = await redis_client.smembers(f'cities:prefix:{query}')
        print(f"🔍 Found {len(city_ids)} potential matches")
        
        # Get full data for each matching city
        for city_id in city_ids:
            city_data = await redis_client.hget('cities:data', city_id)
            if city_data:
                try:
                    city = json.loads(city_data.decode('utf-8'))
                    matches.append({
                        'id': city['id'],
                        'city': city['city'],
                        'state': city.get('state', ''),
                        'country': city['country'],
                        'timezone': city['timezone'],
                        'coordinates': city['coordinates'],
                        'currency': city.get('currency'),
                        'languages_spoken': city.get('languages_spoken'),
                        'national_holidays': city.get('national_holidays')
                    })
                    
                    if len(matches) >= limit:
                        break
                        
                except Exception as e:
                    print(f"❌ Error parsing city data: {str(e)}")
                    continue
        
        print(f"✅ Returning {len(matches)} matches")
        return matches
        
    except Exception as e:
        print(f"💥 Search error: {str(e)}")
        return []

async def clear_city_indexes(city_id: str, old_data: dict):
    """Remove old indexes for a city"""
    try:
        old_name = old_data['city'].lower()
        # Remove from name index
        await redis_client.srem(f'cities:name:{old_name}', city_id)
        # Remove from country index
        await redis_client.srem(f'cities:country:{old_data["country"].lower()}', city_id)
        # Remove from prefix indexes
        for i in range(1, len(old_name)):
            prefix = old_name[:i]
            await redis_client.srem(f'cities:prefix:{prefix}', city_id)
    except Exception as e:
        print(f"Error clearing indexes: {str(e)}")

async def update_city(city_id: str, new_data: dict):
    """Update city data and all its indexes"""
    try:
        # Get old data to remove old indexes
        old_data_raw = await redis_client.hget('cities:data', city_id)
        if old_data_raw:
            old_data = json.loads(old_data_raw.decode('utf-8'))
            await clear_city_indexes(city_id, old_data)
        
        # Update main data
        await redis_client.hset(
            'cities:data',
            city_id,
            json.dumps(new_data, ensure_ascii=False)
        )
        
        # Create new indexes
        city_name = new_data['city'].lower()
        await redis_client.sadd(f'cities:name:{city_name}', city_id)
        await redis_client.sadd(f'cities:country:{new_data["country"].lower()}', city_id)
        
        # Create prefix indexes
        for i in range(1, len(city_name) + 1):
            prefix = city_name[:i]
            await redis_client.sadd(f'cities:prefix:{prefix}', city_id)
            
        print(f"✅ Updated city: {new_data['city']}")
        
    except Exception as e:
        print(f"💥 Error updating city: {str(e)}")
        raise

async def main():
    """Main function to run the Redis manager."""
    try:
        await sync_supabase_to_redis()
        while True:
            await asyncio.sleep(14400)  # Sync every 4 hours
            await sync_supabase_to_redis()
    except Exception as e:
        logging.error(f"Error in main loop: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    asyncio.run(main())

