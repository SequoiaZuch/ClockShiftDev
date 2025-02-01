import React, { useState, useEffect } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { supabase } from '../lib/supabase';
import type { City } from '../types/city';
import type { UserLocation } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);

interface TimeInfo {
  time: string;
  date: string;
  timezone: string;
}

interface LocationResponse {
  location: {
    city: string;
    region: string;
    country: string;
    latitude: string;
    longitude: string;
    timezone: string;
  };
}

export default function TimeComparison() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [comparisonCities, setComparisonCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);

  const MAX_COMPARISON_CITIES = 5;

  useEffect(() => {
    const detectUserLocation = async () => {
      setLocationError(null);
      
      try {
        const response = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }

        const data: LocationResponse = await response.json();
        const { latitude, longitude, timezone, city, region, country } = data.location;
        
        // Format coordinates
        const latDirection = Number(latitude) >= 0 ? 'N' : 'S';
        const longDirection = Number(longitude) >= 0 ? 'E' : 'W';
        const formattedCoords = `${Math.abs(Number(latitude)).toFixed(4)}°${latDirection} / ${Math.abs(Number(longitude)).toFixed(4)}°${longDirection}`;

        // Get timezone offset
        const offset = new Date().getTimezoneOffset();
        const formattedTimezone = `UTC${offset <= 0 ? '+' : '-'}${Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0')}:${Math.abs(offset % 60).toString().padStart(2, '0')}`;

        setUserLocation({
          timezone: formattedTimezone,
          coordinates: formattedCoords,
          city: `${city}, ${region}, ${country}`
        });
      } catch (error) {
        console.error('Error getting location details:', error);
        setLocationError('Could not determine your location');
      }
    };

    detectUserLocation();
  }, []);

  const parseUTCOffset = (timezone: string): number => {
    const match = timezone.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    
    const [_, sign, hours, minutes] = match;
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    return sign === '+' ? totalMinutes : -totalMinutes;
  };

  const getTimeInCity = (city: City | UserLocation): TimeInfo => {
    try {
      let cityTime: dayjs.Dayjs;
      const now = dayjs().utc(); // Start with UTC time

      if ('timezone' in city && typeof city.timezone === 'string') {
        // For cities from the database
        const offsetMinutes = parseUTCOffset(city.timezone);
        cityTime = now.add(offsetMinutes, 'minute');
      } else {
        // For user's local time
        cityTime = now.local();
      }

      return {
        time: cityTime.format('HH:mm:ss'),
        date: cityTime.format('dddd, DD MMM YYYY'),
        timezone: 'timezone' in city ? city.timezone : 'Local Time'
      };
    } catch (error) {
      console.error('Error getting city time:', error);
      return {
        time: '--:--:--',
        date: '---',
        timezone: 'Error'
      };
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .or(`city.ilike.%${query}%,country.ilike.%${query}%`)
      .limit(5);

    if (error) {
      console.error('Error searching cities:', error);
      return;
    }

    setSearchResults(data || []);
  };

  const handleAddCity = (city: City) => {
    if (comparisonCities.length >= MAX_COMPARISON_CITIES) {
      return;
    }
    
    if (!comparisonCities.find(c => c.id === city.id)) {
      setComparisonCities([...comparisonCities, city]);
    }
    setShowCitySelector(false);
    setSearchQuery('');
  };

  const handleRemoveCity = (cityId: string) => {
    setComparisonCities(comparisonCities.filter(city => city.id !== cityId));
  };

  const fetchComparisonTimes = async (cities: string[]) => {
    const queryParams = new URLSearchParams();
    cities.forEach(city => queryParams.append('cities', city));
    
    const response = await fetch(`http://localhost:8000/api/compare?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch comparison times');
    return response.json();
  };

  useEffect(() => {
    const updateTimes = async () => {
      if (comparisonCities.length > 0) {
        const times = await fetchComparisonTimes(comparisonCities.map(city => city.city));
        setComparisonCities(times.cities);
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [comparisonCities.length]);

  return (
    <div className="space-y-6">
      {/* User's Location */}
      {locationError ? (
        <div className="p-6 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-red-400" />
            <p className="text-red-700">{locationError}</p>
          </div>
        </div>
      ) : !userLocation ? (
        <div className="p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600" />
            <p>Detecting your location...</p>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">{userLocation.city}</h3>
              <p className="text-sm text-gray-600 mt-1">{userLocation.timezone}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-medium font-mono tracking-tight text-gray-900">
                {getTimeInCity(userLocation).time}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {getTimeInCity(userLocation).date}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Cities */}
      <div className="space-y-4">
        {comparisonCities.map(city => {
          const cityTime = getTimeInCity(city);
          return (
            <div 
              key={city.id}
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors relative group"
            >
              <button
                onClick={() => handleRemoveCity(city.id)}
                className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm border border-gray-200 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-label="Remove city"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{city.city}</h3>
                  <p className="text-sm text-gray-600 mt-1">{city.timezone}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-medium font-mono tracking-tight text-gray-900">
                    {cityTime.time}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {cityTime.date}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                  {searchResults.length > 0 ? (
                    searchResults.map(city => (
                      <button
                        key={city.id}
                        onClick={() => handleAddCity(city)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <span className="font-medium">{city.city}</span>
                        <span className="text-gray-500 ml-2">{city.country}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500">No cities found</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowCitySelector(true)}
              className="flex items-center justify-center w-full px-4 py-3 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add City
            </button>
          )}
        </div>
      )}
    </div>
  );
}