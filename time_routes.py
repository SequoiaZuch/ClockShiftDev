from datetime import datetime, timedelta
import pytz
from typing import List
from models.location import LocationResponse
import logging

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('time_routes.log'),  # Log to a file
        logging.StreamHandler()  # Log to the terminal
    ]
)

def calculate_city_time(city_data: dict) -> LocationResponse:
    """Shared time calculation logic."""
    try:
        # Get base UTC offset and normalize all possible minus signs
        base_offset = city_data['utc_offset']
        # Handle all variations of minus signs
        if any(minus in base_offset for minus in ['\u2212', '−', '–', '—']):
            base_offset = '-' + base_offset[1:]
        
        base_hours = int(base_offset.split(':')[0])
        
        # Check DST status
        dst_offset = 0
        if city_data.get('dst_status', 'No').lower() == 'yes':
            dst_data = city_data.get('dst_data', {})
            dst_offset = check_dst_status(dst_data)
        
        # Calculate total offset
        total_offset = base_hours + dst_offset
        
        # Calculate local time
        utc_now = datetime.now(pytz.UTC)
        local_time = utc_now + timedelta(hours=total_offset)
        
        return LocationResponse(
            city=city_data['city'],
            state=city_data.get('state', ''),
            country=city_data['country'],
            timezone=city_data['timezone'],
            coordinates=city_data['coordinates'],
            utc_offset=f"+{str(total_offset).zfill(2)}00" if total_offset >= 0 else f"{total_offset}00",
            current_time=local_time.strftime('%H:%M:%S'),
            current_date=local_time.strftime('%A %d %B %Y'),
            dst_status='Yes' if dst_offset > 0 else 'No',
            currency=city_data.get('currency'),
            languages_spoken=city_data.get('languages_spoken'),
            country_code=city_data.get('country_code'),
            national_holidays=city_data.get('national_holidays'),
            details=city_data.get('details')
        )
    except Exception as e:
        logging.error(f"Time calculation error: {str(e)}", exc_info=True)
        raise

def check_dst_status(dst_data: dict) -> int:
    """
    Check if DST is currently active for a city based on dst_offsets table.
    """
    try:
        current_time = datetime.now(pytz.UTC)
        
        # Parse DST dates correctly
        dst_start = datetime.strptime(f"{dst_data['dst_start']} {dst_data['dst_start_time']}", 
                                    "%d/%m/%Y %H:%M").replace(tzinfo=pytz.UTC)
        dst_end = datetime.strptime(f"{dst_data['dst_end']} {dst_data['dst_end_time']}", 
                                    "%d/%m/%Y %H:%M").replace(tzinfo=pytz.UTC)
        
        # Check if current time is within DST period
        if dst_start <= current_time <= dst_end:
            forward_by = int(dst_data['forward_by'].replace('+', '').split(':')[0])
            return forward_by
        
        return 0
    except Exception as e:
        logging.error(f"DST check error: {str(e)}", exc_info=True)
        return 0