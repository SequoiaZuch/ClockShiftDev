import requests
import time
from datetime import datetime, timedelta
from threading import Thread, Lock

# Google Maps Time Zone API endpoint
API_KEY = 'AIzaSyAQgLmmE07rkVeZKqrabcGhP52U7jiqIkc'  # Replace with your actual API key
URL = "https://maps.googleapis.com/maps/api/timezone/json"

# Coordinates for UTC+0 time (Prime Meridian)
LAT = 51.4779
LON = 0.00154

# Global variables to store the latest UTC+0 time and sync details
current_utc_time = None
last_sync_time = None
last_sync_timestamp = None

# Lock to ensure thread-safe updates to the global variables
time_lock = Lock()

def get_utc_time():
    """
    Fetches the current UTC+0 time using the Google Maps Time Zone API.
    Updates the global `current_utc_time`, `last_sync_time`, and `last_sync_timestamp` variables.
    """
    global current_utc_time, last_sync_time, last_sync_timestamp

    try:
        # Get the current timestamp (in seconds) to send in the request
        timestamp = int(time.time())

        # Prepare the request URL with parameters
        response = requests.get(URL, params={
            'location': f'{LAT},{LON}',
            'timestamp': timestamp,
            'key': API_KEY
        })

        # Check if the response is successful
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'OK':
                # Calculate the UTC time using the data returned
                utc_offset = data['dstOffset'] + data['rawOffset']
                utc_time = datetime.utcfromtimestamp(timestamp + utc_offset)

                # Update the global variables in a thread-safe manner
                with time_lock:
                    current_utc_time = utc_time
                    last_sync_time = utc_time
                    last_sync_timestamp = timestamp

                print(f"Updated UTC Time: {utc_time}")
            else:
                print(f"Error: {data['status']}")
        else:
            print(f"Error: Unable to fetch data. Status Code: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

def start_time_poller(interval=3000):
    """
    Starts a background thread that periodically updates the UTC+0 time.
    :param interval: Time interval (in seconds) between updates.
    """
    def poller():
        while True:
            get_utc_time()
            time.sleep(interval)

    # Start the poller in a separate thread
    poller_thread = Thread(target=poller, daemon=True)
    poller_thread.start()

def get_latest_utc_time():
    """
    Returns the latest UTC+0 time, automatically incremented every second.
    """
    global current_utc_time, last_sync_time, last_sync_timestamp

    with time_lock:
        if last_sync_time is None or last_sync_timestamp is None:
            return None  # No sync has been performed yet

        # Calculate the elapsed time since the last sync
        elapsed_time = time.time() - last_sync_timestamp

        # Increment the last sync time by the elapsed time
        current_utc_time = last_sync_time + timedelta(seconds=elapsed_time)

    return current_utc_time

# Start the time poller (updates every 60 seconds by default)
start_time_poller()

# Example usage
if __name__ == "__main__":
    # Simulate other modules querying the latest UTC+0 time
    while True:
        latest_time = get_latest_utc_time()
        if latest_time:
            print(f"Latest UTC Time: {latest_time}")
        else:
            print("Waiting for UTC time to be updated...")
        time.sleep(1)  # Simulate querying every second