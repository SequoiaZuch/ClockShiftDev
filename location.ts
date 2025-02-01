export async function detectLocationFromIP() {
  try {
    // First, get location from IP service
    const geoResponse = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
    if (!geoResponse.ok) throw new Error('Failed to detect location');

    const geoData = await geoResponse.json();
    console.log('IP Location data:', geoData);

    const cityName = geoData.location.city; // e.g., "Riddells Creek"
    const timezone = geoData.location.timezone; // e.g., "Australia/Melbourne"

    // Extract the fallback city name from the timezone (e.g., "Australia/Melbourne" → "Melbourne")
    const fallbackCityName = timezone.split('/')[1]; // Split and take the second part

    // Try to fetch city time using the exact city name
    let response = await fetch(`http://localhost:8000/location/${encodeURIComponent(cityName)}`);
    let data;

    if (!response.ok) {
      console.log('Exact city not found, trying fallback city:', fallbackCityName);
      
      // If the exact city is not found, try the fallback city name
      response = await fetch(`http://localhost:8000/location/${encodeURIComponent(fallbackCityName)}`);
      if (!response.ok) throw new Error('Failed to fetch location time for fallback city');

      data = await response.json();
    } else {
      data = await response.json();
    }

    console.log('City time data:', data);

    // Return the city time data
    return data;
  } catch (error) {
    console.error('Error detecting location:', error);
    throw error;
  }
}