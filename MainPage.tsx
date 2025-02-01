import { useEffect, useState, useCallback } from 'react';                                                                                                                              
import { Clock, MapPin, Globe, Search, Loader2, Info, DollarSign, Languages, Calendar } from 'lucide-react';                                                                           
import type { UserLocation, City } from '../types/city';                                                                                                                               
import locationData from '../data/locations.json';                                                                                                                                         
import { parseLocationData, searchLocations } from '../utils/searchUtils';                                                                                                             
                                                                                                                                                                                        
const cityDataCache = new Map<string, { data: City, timestamp: number }>();                                                                                                            
localStorage.removeItem('mainPageOffset');                                                                                                                                             
                                                                                                                                                                                        
const useDebounce = (value: string, delay: number) => {                                                                                                                                
  const [debouncedValue, setDebouncedValue] = useState(value);                                                                                                                         
  useEffect(() => {                                                                                                                                                                    
    const handler = setTimeout(() => setDebouncedValue(value), delay);                                                                                                                 
    return () => clearTimeout(handler);                                                                                                                                                
  }, [value, delay]);                                                                                                                                                                  
  return debouncedValue;                                                                                                                                                               
};                                                                                                                                                                                     
                                                                                                                                                                                        
export default function MainPage() {                                                                                                                                                   
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);                                                                                                         
  const [locationError, setLocationError] = useState<string | null>(null);                                                                                                             
  const [locationTime, setLocationTime] = useState(new Date());                                                                                                                        
  const [searchQuery, setSearchQuery] = useState('');                                                                                                                                  
  const [searchResults, setSearchResults] = useState<City[]>([]);                                                                                                                      
  const [isSearching, setIsSearching] = useState(false);                                                                                                                               
  const [cityDetails, setCityDetails] = useState<any>(null);                                                                                                                           
  const [apiData, setApiData] = useState<{ utc_offset: string } | null>(null);                                                                                                         
  const [allLocations, setAllLocations] = useState<ReturnType<typeof parseLocationData>>([]);                                                                                          
                                                                                                                                                                                        
  // Load and parse locations on mount                                                                                                                                                 
  useEffect(() => {                                                                                                                                                                    
    const parsedLocations = locationData.locations.map(loc => ({
      ...loc,
      searchStr: `${loc.city} ${loc.state} ${loc.country}`.toLowerCase()
    }));
    setAllLocations(parsedLocations);
  }, []);                                                                                                                                                                              
                                                                                                                                                                                        
  const debouncedSearchQuery = useDebounce(searchQuery, 300);                                                                                                                          
                                                                                                                                                                                        
  // Handle local search                                                                                                                                                               
  useEffect(() => {                                                                                                                                                                    
    if (debouncedSearchQuery) {                                                                                                                                                        
      setIsSearching(true);  // Start loading
      const results = searchLocations(debouncedSearchQuery.toLowerCase(), allLocations);                                                                                                             
      setSearchResults(results.map(loc => ({                                                                                                                                           
        id: `${loc.city}-${loc.country}`,                                                                                                                                              
        city: loc.city,                                                                                                                                                                
        state: loc.state,                                                                                                                                                              
        country: loc.country,                                                                                                                                                          
        timezone: '', // Will be fetched from backend when selected                                                                                                                    
        coordinates: '' // Will be fetched from backend when selected                                                                                                                  
      })));                                                                                                                                                                            
      setIsSearching(false);  // End loading
    } else {                                                                                                                                                                           
      setSearchResults([]);                                                                                                                                                            
    }                                                                                                                                                                                  
  }, [debouncedSearchQuery, allLocations]);                                                                                                                                            
                                                                                                                                                                                        
  // Handle city selection                                                                                                                                                             
  const handleCitySelect = async (city: City) => {                                                                                                                                     
    try {                                                                                                                                                                              
      const response = await fetch(                                                                                                                                                    
        `http://localhost:8000/location/${encodeURIComponent(city.city)}`                                                                                                              
      );                                                                                                                                                                               
                                                                                                                                                                                        
      if (!response.ok) {                                                                                                                                                              
        const error = await response.json();                                                                                                                                           
        throw new Error(error.detail?.message || 'Failed to fetch city data');                                                                                                         
      }                                                                                                                                                                                
                                                                                                                                                                                        
      const data = await response.json();                                                                                                                                              
                                                                                                                                                                                        
      setUserLocation({                                                                                                                                                                
        timezone: data.timezone,                                                                                                                                                       
        coordinates: data.coordinates,                                                                                                                                                 
        city: `${data.city}, ${data.state}, ${data.country}`                                                                                                                           
      });                                                                                                                                                                              
                                                                                                                                                                                        
      if (data.currency || data.languages_spoken || data.national_holidays || data.details) {                                                                                          
        setCityDetails({                                                                                                                                                               
          currency: data.currency,                                                                                                                                                     
          languages_spoken: data.languages_spoken,                                                                                                                                     
          national_holidays: data.national_holidays,                                                                                                                                   
          details: data.details                                                                                                                                                        
        });                                                                                                                                                                            
      }                                                                                                                                                                                
                                                                                                                                                                                        
      setSearchQuery('');                                                                                                                                                              
      setSearchResults([]);                                                                                                                                                            
                                                                                                                                                                                        
    } catch (error) {                                                                                                                                                                  
      console.error('Error updating location:', error);                                                                                                                                
      setLocationError(error instanceof Error ? error.message : 'Failed to update location');                                                                                          
    }                                                                                                                                                                                  
  };

  // Initial location detection
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
        if (!response.ok) throw new Error('Failed to detect location');
        const geoData = await response.json();
        const cityName = geoData.location.city;
        const timezone = geoData.location.timezone;
        const fallbackCityName = timezone.split('/')[1];

        // Check cache first for the exact city name
        const cachedData = cityDataCache.get(cityName);
        const now = Date.now();

        if (cachedData && now - cachedData.timestamp < 60 * 60 * 1000) {
          setCityDetails(cachedData.data);
          setUserLocation({
            timezone: cachedData.data.timezone,
            coordinates: cachedData.data.coordinates,
            city: `${cachedData.data.city}, ${cachedData.data.state}, ${cachedData.data.country}`,
          });
        } else {
          // Fetch from Redis via FastAPI backend
          const redisResponse = await fetch(
            `http://localhost:8000/location/${encodeURIComponent(cityName)}`
          );

          if (!redisResponse.ok) {
            console.log('Exact city not found in Redis, trying fallback city:', fallbackCityName);
            const fallbackRedisResponse = await fetch(
              `http://localhost:8000/location/${encodeURIComponent(fallbackCityName)}`
            );

            if (!fallbackRedisResponse.ok) {
              throw new Error('Fallback city not found in database');
            }

            const fallbackData = await fallbackRedisResponse.json();
            cityDataCache.set(cityName, { data: fallbackData, timestamp: now });
            setCityDetails(fallbackData);
            setUserLocation({
              timezone: fallbackData.timezone,
              coordinates: fallbackData.coordinates,
              city: `${fallbackData.city}, ${fallbackData.state}, ${fallbackData.country}`,
            });
          } else {
            const data = await redisResponse.json();
            cityDataCache.set(cityName, { data, timestamp: now });
            setCityDetails(data);
            setUserLocation({
              timezone: data.timezone,
              coordinates: data.coordinates,
              city: `${data.city}, ${data.state}, ${data.country}`,
            });
          }
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        setLocationError('Could not detect location. Please search for a city.');
      }
    };

    detectLocation();
  }, []);

  // Clear cache entries older than 60 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      cityDataCache.forEach((value, key) => {
        if (now - value.timestamp >= 60 * 60 * 1000) {
          cityDataCache.delete(key);
        }
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Update time effect
  useEffect(() => {
    if (!userLocation?.timezone) {
      console.log('⚠️ No timezone set');
      return;
    }

    const fetchTime = async () => {
      try {
        const cityName = userLocation.city.split(',')[0].trim();
        console.log('🌆 Fetching time for city:', cityName);

        const response = await fetch(
          `http://localhost:8000/location/${encodeURIComponent(cityName)}`
        );

        if (!response.ok) throw new Error('Failed to fetch time');
        const data = await response.json();
        console.log('📡 Server response:', data);

        const localTime = data.current_time;
        const localDate = data.current_date;
        const dateTimeString = `${localDate} ${localTime}`;
        console.log('🕒 Parsed date and time:', dateTimeString);

        const adjustedTime = new Date(dateTimeString);
        console.log('🎯 Final adjusted time:', adjustedTime);

        setLocationTime(adjustedTime);
        setApiData(data);
      } catch (error) {
        console.error('💥 Error fetching time:', error);
      }
    };

    fetchTime();

    const interval = setInterval(() => {
      setLocationTime((prev) => {
        if (!prev) return prev;
        const newTime = new Date(prev);
        newTime.setSeconds(newTime.getSeconds() + 1);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userLocation?.timezone, userLocation?.city]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header with Search */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ClockShift</h1>
          <div className="relative w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cities..."
              className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            {isSearching && (
              <div className="absolute right-3 top-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50">
                {searchResults.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCitySelect(city)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    <div className="font-medium">{city.city}</div>
                    <div className="text-sm text-gray-600">
                      {city.state && `${city.state}, `}{city.country}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {locationError ? (
          <div className="p-4 bg-red-50 rounded-lg text-red-700">
            {locationError}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Time Display Column */}
            <div className="space-y-8">
              {/* Main Time Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center">
                <div className="mb-4">
                  <h2 className="text-7xl font-mono font-bold text-gray-900 tracking-tight">
                    {locationTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </h2>
                </div>
                <p className="text-xl text-gray-600 mb-8">
                  {locationTime.toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                {/* Location Details */}
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-medium">Location</span>
                    </div>
                    <p className="text-xl text-gray-900">{userLocation?.city}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">Timezone</span>
                    </div>
                    <p className="text-lg text-gray-900">{userLocation?.timezone}</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">UTC Offset</span>
                    </div>
                    <p className="text-lg text-gray-900">{apiData?.utc_offset || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* City Details Column */}
            {cityDetails && (
              <div className="space-y-6">
                {/* City Information Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <Info className="w-7 h-7 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">City Information</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Currency */}
                    <div className="group hover:bg-blue-50 rounded-lg p-4 transition-colors">
                      <div className="flex items-center space-x-3 text-gray-600 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-medium">Currency</span>
                      </div>
                      <p className="text-lg text-gray-900">
                        {cityDetails.currency || 'Not available'}
                      </p>
                    </div>

                    {/* Languages */}
                    <div className="group hover:bg-blue-50 rounded-lg p-4 transition-colors">
                      <div className="flex items-center space-x-3 text-gray-600 mb-2">
                        <Languages className="w-5 h-5" />
                        <span className="font-medium">Languages</span>
                      </div>
                      <p className="text-lg text-gray-900">
                        {cityDetails.languages_spoken || 'Not available'}
                      </p>
                    </div>

                    {/* National Holidays */}
                    <div className="group hover:bg-blue-50 rounded-lg p-4 transition-colors">
                      <div className="flex items-center space-x-3 text-gray-600 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">National Holidays</span>
                      </div>
                      <p className="text-lg text-gray-900">
                        {cityDetails.national_holidays || 'Not available'}
                      </p>
                    </div>

                    {/* Additional Info */}
                    <div className="group hover:bg-blue-50 rounded-lg p-4 transition-colors">
                      <div className="flex items-center space-x-3 text-gray-600 mb-2">
                        <Info className="w-5 h-5" />
                        <span className="font-medium">Additional Info</span>
                      </div>
                      <p className="text-lg text-gray-900">
                        {cityDetails.details || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}