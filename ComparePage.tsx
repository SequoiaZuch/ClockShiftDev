import React, { useState, useEffect } from 'react';
import { Clock, X, Plus, Search, Loader2 } from 'lucide-react';
import { useLocations } from '../contexts/LocationContext';
import { useDebounce } from 'use-debounce';

interface City {
  id: string;
  city: string;
  state?: string;
  country: string;
  timezone: string;
  current_time: string;
  current_date: string;
  coordinates?: string;
}

interface SearchResult {
  id: string;
  city: string;
  state?: string;
  country: string;
  timezone: string;
}

export default function ComparePage() {
  const { allLocations } = useLocations();

  const [currentLocation, setCurrentLocation] = useState<City | null>(() => {
    const saved = localStorage.getItem('currentLocation');
    return saved ? JSON.parse(saved) : null;
  });

  const [comparisonCities, setComparisonCities] = useState<City[]>(() => {
    const saved = localStorage.getItem('comparisonCities');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const MAX_COMPARISON_CITIES = 5;

  // Update time for a city
  const updateCityTime = (city: City): City => {
    try {
      const now = new Date();
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: city.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: city.timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return {
        ...city,
        current_time: now.toLocaleTimeString('en-US', timeOptions),
        current_date: now.toLocaleDateString('en-US', dateOptions),
      };
    } catch (error) {
      console.error('Error updating city time:', error);
      return city;
    }
  };

  // Get current location on load
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
        if (!response.ok) throw new Error('Failed to detect location');
        
        const geoData = await response.json();
        const cityName = geoData.location.city;
        
        // Fetch detailed city data
        const cityResponse = await fetch(
          `http://localhost:8000/location/${encodeURIComponent(cityName)}`
        );
        
        if (!cityResponse.ok) throw new Error('Failed to fetch city details');
        
        const cityData = await cityResponse.json();
        setCurrentLocation({
          id: cityData.id || Date.now().toString(),
          city: cityData.city,
          state: cityData.state,
          country: cityData.country,
          timezone: cityData.timezone,
          current_time: cityData.current_time,
          current_date: cityData.current_date,
          coordinates: cityData.coordinates,
        });
      } catch (error) {
        console.error('Error detecting location:', error);
        setLocationError('Could not detect your location. Please search for a city.');
      }
    };

    detectLocation();
  }, []);

  // Add this useEffect to check if locations are loaded
  useEffect(() => {
    console.log('Available locations:', allLocations.length);
    console.log('Sample locations:', allLocations.slice(0, 3));
  }, [allLocations]);

  // Handle city search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Update the search effect to use debounced query
  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      console.log('Searching for:', debouncedSearchQuery);
      setIsSearching(true);
      const results = allLocations.filter(location => 
        location.searchStr.includes(debouncedSearchQuery.toLowerCase())
      );
      console.log('Found results:', results.length);
      
      setSearchResults(results.map(loc => ({
        id: `${loc.city}-${loc.country}`,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        timezone: '',
        coordinates: ''
      })));
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, allLocations]);

  // Add city to comparison
  const handleAddCity = async (city: SearchResult) => {
    if (comparisonCities.length >= MAX_COMPARISON_CITIES) return;

    try {
      const response = await fetch(
        `http://localhost:8000/location/${encodeURIComponent(city.city)}`
      );
      
      if (!response.ok) throw new Error('Failed to get city data');

      const cityData = await response.json();
      const newCity: City = {
        id: cityData.id || Date.now().toString(),
        city: cityData.city,
        state: cityData.state,
        country: cityData.country,
        timezone: cityData.timezone,
        current_time: cityData.current_time,
        current_date: cityData.current_date,
        coordinates: cityData.coordinates,
      };

      setComparisonCities(prev => [...prev, newCity]);
      setShowCitySelector(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding city:', error);
    }
  };

  // Time update effects
  useEffect(() => {
    if (currentLocation) {
      const interval = setInterval(() => {
        setCurrentLocation(prev => prev ? updateCityTime(prev) : null);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentLocation?.timezone]);

  useEffect(() => {
    const intervals = comparisonCities.map(city => {
      return setInterval(() => {
        setComparisonCities(prev =>
          prev.map(c => c.id === city.id ? updateCityTime(c) : c)
        );
      }, 1000);
    });

    return () => intervals.forEach(clearInterval);
  }, [comparisonCities]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Compare City Times</h1>
          </div>

          {/* Current Location */}
          {locationError ? (
            <div className="p-4 bg-red-50 rounded-lg mb-6">
              <p className="text-red-700">{locationError}</p>
            </div>
          ) : currentLocation && (
            <div className="p-6 bg-blue-50 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {currentLocation.city}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentLocation.state && `${currentLocation.state}, `}
                    {currentLocation.country}
                  </p>
                  <p className="text-sm text-gray-600">{currentLocation.timezone}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-medium font-mono tracking-tight text-gray-900">
                    {currentLocation.current_time}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {currentLocation.current_date}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Cities */}
          <div className="space-y-4">
            {comparisonCities.map((city) => (
              <div
                key={city.id}
                className="p-6 bg-white rounded-lg border border-gray-200 relative group"
              >
                <button
                  onClick={() => setComparisonCities(prev => 
                    prev.filter(c => c.id !== city.id)
                  )}
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">{city.city}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {city.state && `${city.state}, `}
                      {city.country}
                    </p>
                    <p className="text-sm text-gray-600">{city.timezone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-medium font-mono tracking-tight text-gray-900">
                      {city.current_time}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {city.current_date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add City Button/Search */}
          {comparisonCities.length < MAX_COMPARISON_CITIES && (
            <div className="mt-4">
              {showCitySelector ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search cities..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="absolute right-3 top-3">
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <Search className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  {searchQuery && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg">
                      {searchResults.map(city => (
                        <button
                          key={city.id}
                          onClick={() => handleAddCity(city)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50"
                        >
                          <span className="font-medium">{city.city}</span>
                          {city.state && (
                            <span className="text-gray-500 ml-2">{city.state},</span>
                          )}
                          <span className="text-gray-500 ml-2">{city.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowCitySelector(true)}
                  className="flex items-center justify-center w-full px-4 py-3 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add City
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}