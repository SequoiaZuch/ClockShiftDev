import React, { useState, useEffect, useMemo } from 'react';                                                                                                                           
import { searchLocations, parseLocationData } from '../utils/searchUtils';                                                                                                             
import { Clock, X, Plus, Search } from 'lucide-react';                                                                                                                                 
import { detectLocationFromIP } from '../utils/location';                                                                                                                              
                                                                                                                                                                                       
// Define City type if not imported                                                                                                                                                    
interface City {                                                                                                                                                                       
  id: string;                                                                                                                                                                          
  city: string;                                                                                                                                                                        
  country: string;                                                                                                                                                                     
  timezone: string;                                                                                                                                                                    
  current_time: string;                                                                                                                                                                
  current_date: string;                                                                                                                                                                
}                                                                                                                                                                                      
                                                                                                                                                                                       
interface SearchResult {                                                                                                                                                               
  id: string;                                                                                                                                                                          
  city: string;                                                                                                                                                                        
  country: string;                                                                                                                                                                     
  timezone: string;                                                                                                                                                                    
}                                                                                                                                                                                      
                                                                                                                                                                                       
export function ComparePage() {                                                                                                                                                
  const [currentLocation, setCurrentLocation] = useState<City | null>(() => {                                                                                                          
    const saved = localStorage.getItem('currentLocation');                                                                                                                             
    return saved ? JSON.parse(saved) : null;                                                                                                                                           
  });                                                                                                                                                                                  
                                                                                                                                                                                       
  const [comparisonCities, setComparisonCities] = useState<City[]>(() => {                                                                                                             
    const saved = localStorage.getItem('comparisonCities');                                                                                                                            
    return saved ? JSON.parse(saved) : [];                                                                                                                                             
  });                                                                                                                                                                                  
                                                                                                                                                                                       
  const [searchQuery, setSearchQuery] = useState('');                                                                                                                                  
  const [locations, setLocations] = useState<ReturnType<typeof parseLocationData>>([]);                                                                                                
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);                                                                                                              
  const [showCitySelector, setShowCitySelector] = useState(false);                                                                                                                     
  const [locationError, setLocationError] = useState<string | null>(null);                                                                                                             
                                                                                                                                                                                       
  const MAX_COMPARISON_CITIES = 5;                                                                                                                                                     
                                                                                                                                                                                       
  // Function to update the time for a city                                                                                                                                            
  const updateCityTime = (city: City): City => {                                                                                                                                       
    const now = new Date();                                                                                                                                                            
    const options: Intl.DateTimeFormatOptions = {                                                                                                                                      
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
    const currentTime = now.toLocaleTimeString('en-US', options);                                                                                                                      
    const currentDate = now.toLocaleDateString('en-US', dateOptions);                                                                                                                  
    return { ...city, current_time: currentTime, current_date: currentDate };                                                                                                          
  };                                                                                                                                                                                   
                                                                                                                                                                                       
  // Update current location time                                                                                                                                                      
  useEffect(() => {                                                                                                                                                                    
    if (currentLocation) {                                                                                                                                                             
      const interval = setInterval(() => {                                                                                                                                             
        setCurrentLocation(updateCityTime(currentLocation));                                                                                                                           
      }, 1000);                                                                                                                                                                        
      return () => clearInterval(interval);                                                                                                                                            
    }                                                                                                                                                                                  
  }, [currentLocation]);                                                                                                                                                               
                                                                                                                                                                                       
  // Update comparison cities time                                                                                                                                                     
  useEffect(() => {                                                                                                                                                                    
    const intervals = comparisonCities.map(city => {                                                                                                                                   
      return setInterval(() => {                                                                                                                                                       
        setComparisonCities(prevCities =>                                                                                                                                              
          prevCities.map(c =>                                                                                                                                                          
            c.id === city.id ? updateCityTime(c) : c                                                                                                                                   
          )                                                                                                                                                                            
        );                                                                                                                                                                             
      }, 1000);                                                                                                                                                                        
    });                                                                                                                                                                                
                                                                                                                                                                                       
    return () => intervals.forEach(interval => clearInterval(interval));                                                                                                               
  }, [comparisonCities]);                                                                                                                                                              
                                                                                                                                                                                       
  // Get current location when page loads                                                                                                                                              
  useEffect(() => {                                                                                                                                                                    
    const detectLocation = async () => {                                                                                                                                               
      try {                                                                                                                                                                            
        const data = await detectLocationFromIP();                                                                                                                                     
        setCurrentLocation(data);                                                                                                                                                      
      } catch (error) {                                                                                                                                                                
        console.error('Error detecting location:', error);                                                                                                                             
        setLocationError('Could not detect your location');                                                                                                                            
      }                                                                                                                                                                                
    };                                                                                                                                                                                 
                                                                                                                                                                                       
    detectLocation();                                                                                                                                                                  
  }, []);                                                                                                                                                                              
                                                                                                                                                                                       
  // Save to localStorage when state changes                                                                                                                                           
  useEffect(() => {                                                                                                                                                                    
    if (currentLocation) {                                                                                                                                                             
      localStorage.setItem('currentLocation', JSON.stringify(currentLocation));                                                                                                        
    }                                                                                                                                                                                  
  }, [currentLocation]);                                                                                                                                                               
                                                                                                                                                                                       
  useEffect(() => {                                                                                                                                                                    
    localStorage.setItem('comparisonCities', JSON.stringify(comparisonCities));                                                                                                        
  }, [comparisonCities]);                                                                                                                                                              
                                                                                                                                                                                       
  // Handle city search                                                                                                                                                                
  // Load locations data on component mount                                                                                                                                            
  useEffect(() => {                                                                                                                                                                    
    fetch('/data/locations.txt')                                                                                                                                                       
      .then(response => response.text())                                                                                                                                               
      .then(data => {                                                                                                                                                                  
        const parsedLocations = parseLocationData(data);                                                                                                                               
        setLocations(parsedLocations);                                                                                                                                                 
      })                                                                                                                                                                               
      .catch(error => {                                                                                                                                                                
        console.error('Error loading locations:', error);                                                                                                                              
      });                                                                                                                                                                              
  }, []);                                                                                                                                                                              
                                                                                                                                                                                       
  // Update suggestions when search query changes                                                                                                                                      
  const suggestions = useMemo(() => {                                                                                                                                                  
    if (searchQuery.length >= 2) {                                                                                                                                                     
      return searchLocations(searchQuery, locations);                                                                                                                                  
    }                                                                                                                                                                                  
    return [];                                                                                                                                                                         
  }, [searchQuery, locations]);                                                                                                                                                        
                                                                                                                                                                                       
  const handleSearch = async (query: string) => {                                                                                                                                      
    setSearchQuery(query);                                                                                                                                                             
    if (query.length < 2) {                                                                                                                                                            
      setSearchResults([]);                                                                                                                                                            
      return;                                                                                                                                                                          
    }                                                                                                                                                                                  
                                                                                                                                                                                       
    // First try local search                                                                                                                                                          
    if (suggestions.length > 0) {                                                                                                                                                      
      setSearchResults(suggestions);                                                                                                                                                   
      return;                                                                                                                                                                          
    }                                                                                                                                                                                  
                                                                                                                                                                                       
    // Fallback to API search                                                                                                                                                          
    try {                                                                                                                                                                              
      const response = await fetch(`http://localhost:8000/api/location/${encodeURIComponent(query)}`);                                                                                 
      if (!response.ok) throw new Error('Search failed');                                                                                                                              
                                                                                                                                                                                       
      const data = await response.json();                                                                                                                                              
      setSearchResults([data]);                                                                                                                                                        
    } catch (error) {                                                                                                                                                                  
      console.error('Search error:', error);                                                                                                                                           
      setSearchResults([]);                                                                                                                                                            
    }                                                                                                                                                                                  
  };                                                                                                                                                                                   
                                                                                                                                                                                       
  // Add city to comparison                                                                                                                                                            
  const handleAddCity = async (city: SearchResult) => {                                                                                                                                
    if (comparisonCities.length >= MAX_COMPARISON_CITIES) return;                                                                                                                      
                                                                                                                                                                                       
    try {                                                                                                                                                                              
      const response = await fetch(`http://localhost:8000/api/location/${encodeURIComponent(city.city)}`);                                                                             
      if (!response.ok) throw new Error('Failed to get city time');                                                                                                                    
                                                                                                                                                                                       
      const cityData = await response.json();                                                                                                                                          
      setComparisonCities([...comparisonCities, cityData]);                                                                                                                            
      setShowCitySelector(false);                                                                                                                                                      
      setSearchQuery('');                                                                                                                                                              
      setSearchResults([]);                                                                                                                                                            
    } catch (error) {                                                                                                                                                                  
      console.error('Error adding city:', error);                                                                                                                                      
    }                                                                                                                                                                                  
  };                                                                                                                                                                                   
                                                                                                                                                                                       
  // Remove city from comparison                                                                                                                                                       
  const handleRemoveCity = (cityToRemove: City) => {                                                                                                                                   
    setComparisonCities(prevCities => {                                                                                                                                                
      const newCities = prevCities.filter(city =>                                                                                                                                      
        city.city !== cityToRemove.city ||                                                                                                                                             
        city.timezone !== cityToRemove.timezone                                                                                                                                        
      );                                                                                                                                                                               
      return newCities;                                                                                                                                                                
    });                                                                                                                                                                                
  };                                                                                                                                                                                   
                                                                                                                                                                                       
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
                  <p className="text-sm text-gray-600 mt-1">{currentLocation.timezone}</p>                                                                                             
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
            {comparisonCities.map((city, index) => (                                                                                                                                   
              <div                                                                                                                                                                     
                key={`${city.city}-${city.timezone}-${index}`}                                                                                                                         
                className="p-6 bg-white rounded-lg border border-gray-200 relative group"                                                                                              
              >                                                                                                                                                                        
                <button                                                                                                                                                                
                  onClick={() => handleRemoveCity(city)}                                                                                                                               
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm hover:text-red-500"                                                                          
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
                <div className="relative w-full">                                                                                                                                      
                  <input                                                                                                                                                               
                    type="text"                                                                                                                                                        
                    value={searchQuery}                                                                                                                                                
                    onChange={(e) => handleSearch(e.target.value)}                                                                                                                     
                    placeholder="Search for a city..."                                                                                                                                 
                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"                                         
                    autoFocus                                                                                                                                                          
                  />                                                                                                                                                                   
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />                                                                                                   
                                                                                                                                                                                       
                  {searchResults.length > 0 && (                                                                                                                                       
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50">                                                                         
                      {searchResults.map((city, index) => (                                                                                                                            
                        <button                                                                                                                                                        
                          key={index}                                                                                                                                                  
                          onClick={() => {                                                                                                                                             
                            handleAddCity({                                                                                                                                            
                              id: city.id || '',                                                                                                                                       
                              city: city.city,                                                                                                                                         
                              country: city.country,                                                                                                                                   
                              timezone: city.timezone                                                                                                                                  
                            });                                                                                                                                                        
                            setSearchQuery('');                                                                                                                                        
                            setSearchResults([]);                                                                                                                                      
                          }}                                                                                                                                                           
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"                                                                                                     
                        >                                                                                                                                                              
                          <div className="font-medium">{city.city}</div>                                                                                                               
                          <div className="text-sm text-gray-600">                                                                                                                      
                            {city.state && `${city.state}, `}                                                                                                                          
                            {city.country}                                                                                                                                             
                          </div>                                                                                                                                                       
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