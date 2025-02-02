import { useState, useEffect, useRef } from 'react';
import { Clock, Plus, X, GripVertical, ArrowUpDown } from 'lucide-react';

import { City, TimeInfo } from '../types/city';
import { useLocations } from '../contexts/LocationContext';
import { TimezoneCalc } from '../utils/tzcalc';

const MAX_CITIES = 5;
const UPDATE_INTERVAL = 1000; // 1 second

// Define tile IDs as constants
const REFERENCE_TILE_ID = 'Tile.01';
const COMPARISON_TILE_IDS = ['Tile.02', 'Tile.03', 'Tile.04', 'Tile.05', 'Tile.06'];

interface TimeSliderProps {
    value: number;
    onChange: (value: number) => void;
    isReference: boolean;
}

const TimeSlider = ({ value, onChange, isReference }: TimeSliderProps) => {
    const renderTicks = () => {
        const ticks = [];
        for (let i = 0; i <= 96; i++) {
            const isHourMark = i % 4 === 0;
            ticks.push(
                <div
                    key={i}
                    className={`absolute transform -translate-x-[0.5px] h-4 w-[1px] -top-1 ${
                        isHourMark ? 'bg-gray-400' : 'bg-gray-300'
                    }`}
                    style={{ left: `${(i / 96) * 100}%` }}
                />
            );
        }
        return ticks;
    };

    return (
        <div className="mt-4 relative">
            <div className="w-full h-[2px] bg-gray-300 absolute top-6" />
            <div className="w-[2px] h-12 bg-gray-400 absolute left-1/2 -translate-x-1/2" />
            <div className="relative w-full h-6">{renderTicks()}</div>
            <input
                type="range"
                min="0"
                max="1440"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                disabled={!isReference}
                className={`w-full appearance-none bg-transparent relative top-0
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-6
                    [&::-webkit-slider-thumb]:h-8
                    [&::-webkit-slider-thumb]:bg-transparent
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:relative
                    [&::-webkit-slider-thumb]:z-10
                    ${!isReference ? 'opacity-50' : ''}`}
            />
            <div
                className="absolute w-6 h-8 -mt-4 pointer-events-none"
                style={{
                    left: `calc(${(value / 1440) * 100}% - 12px)`,
                    top: '24px',
                }}
            >
                <div className="w-full h-full bg-white rounded-md shadow-md flex items-center justify-center">
                    <GripVertical className="w-4 h-4 text-[hsl(0,84.2%,60.2%)]" />
                </div>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600 mt-1.5">
                <span>12 AM</span>
                <span>12 PM</span>
                <span>12 AM</span>
            </div>
        </div>
    );
};

const ConversionPage = () => {// Core state
  const [tileData, setTileData] = useState<Record<string, City>>({});
  const [cityTimes, setCityTimes] = useState<Record<string, TimeInfo>>({});
  const [timeCalcs, setTimeCalcs] = useState<Record<string, TimezoneCalc>>({});
  const [referenceCity, setReferenceCity] = useState<City | null>(null);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  
  // Time management
  const [baseDate, setBaseDate] = useState(new Date());
  const [sliderValue, setSliderValue] = useState(
      new Date().getHours() * 60 + new Date().getMinutes()
  );
  const [timeMode, setTimeMode] = useState<0 | 1 | 2>(0); // 0=current, 1=past, 2=future
  const initialReferenceTime = useRef(new Date());
  
  const { allLocations } = useLocations();

  // Current location state
  const [currentLocation, setCurrentLocation] = useState<{
      city: string;
      region: string;
      time: string;
      date: string;
  } | null>(null);

  // Time update effect for current time mode
  useEffect(() => {
      if (timeMode === 0) {
          const interval = setInterval(() => {
              const now = new Date();
              // Update current location time
              if (currentLocation) {
                  setCurrentLocation(prev => prev ? {
                      ...prev,
                      time: now.toLocaleTimeString(),
                      date: now.toLocaleDateString('en-US', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                      })
                  } : null);
              }

              // Update times for all tiles
              const newMinutes = now.getHours() * 60 + now.getMinutes();
              setSliderValue(newMinutes);
              setBaseDate(now);
              updateAllTimes(now);
          }, UPDATE_INTERVAL);

          return () => clearInterval(interval);
      }
  }, [timeMode, currentLocation]);

  // Time update function
  const updateAllTimes = async (baseTime?: Date) => {
      const updatedTimes: Record<string, TimeInfo> = {};
      
      for (const [tileId, calculator] of Object.entries(timeCalcs)) {
          calculator.setTimeMode(timeMode);
          if (baseTime) {
              calculator.setBaseTime(baseTime);
          }
          const timeInfo = await calculator.getFormattedTimeInfo();
          updatedTimes[tileId] = timeInfo;
      }
      
      setCityTimes(updatedTimes);
  };// Current location detection
  useEffect(() => {
      const detectLocation = async () => {
          try {
              const response = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
              if (!response.ok) throw new Error('Failed to detect location');
              const geoData = await response.json();

              const cityResponse = await fetch(
                  `http://localhost:8000/location/${encodeURIComponent(geoData.location.city)}`
              );
              if (!cityResponse.ok) throw new Error('Failed to fetch city data');
              const cityData = await cityResponse.json();

              setCurrentLocation({
                  city: cityData.city,
                  region: `${cityData.state}, ${cityData.country}`,
                  time: new Date().toLocaleTimeString(),
                  date: new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                  })
              });
          } catch (error) {
              console.error('Location detection error:', error);
              setError('Could not detect your location');
          }
      };

      detectLocation();
  }, []);

  // Time management functions
  const handleSliderChange = async (minutes: number) => {
      const newDate = new Date();
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      newDate.setHours(hours, mins, 0, 0);
      
      setBaseDate(newDate);
      setSliderValue(minutes);

      const currentTime = new Date();
      const newTimeMode = newDate > currentTime ? 2 : 
                         newDate < currentTime ? 1 : 0;
      
      setTimeMode(newTimeMode);
      await updateAllTimes(newDate);
  };

  const resetToCurrentTime = async () => {
      const calculator = timeCalcs[REFERENCE_TILE_ID];
      if (calculator) {
          const currentTime = await calculator.fetchCurrentTime();
          setBaseDate(currentTime);
          const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
          setSliderValue(minutes);
          setTimeMode(0);
          initialReferenceTime.current = currentTime;
          await updateAllTimes(currentTime);
      }
  };

  // City management functions
  const handleAddCity = async (city: City) => {
      try {
          const response = await fetch(
              `http://localhost:8000/location/${encodeURIComponent(city.city)}`
          );
          const cityData = await response.json();

          const nextTileId = !referenceCity ? 
              REFERENCE_TILE_ID : 
              COMPARISON_TILE_IDS.find(id => !tileData[id]);

          if (!nextTileId) {
              setError(`Maximum ${MAX_CITIES} cities allowed`);
              return;
          }

          // Format UTC offset
          const formattedOffset = cityData.utc_offset.includes(':') ? 
              cityData.utc_offset : 
              `${cityData.utc_offset.slice(0, -2)}:${cityData.utc_offset.slice(-2)}`;

          const dstData = cityData.dst_status === 'YES' ? {
              dst_start: cityData.dst_data.dst_start,
              dst_start_time: cityData.dst_data.dst_start_time,
              dst_end: cityData.dst_data.dst_end,
              dst_end_time: cityData.dst_data.dst_end_time
          } : undefined;

          const calculator = new TimezoneCalc(formattedOffset, dstData);
          
          // If this is the first tile or reference tile is in current mode,
          // fetch current time
          if (nextTileId === REFERENCE_TILE_ID || 
              (timeCalcs[REFERENCE_TILE_ID]?.getTimeMode() === 0)) {
              await calculator.fetchCurrentTime();
          } else {
              // Use reference tile's time
              const refTime = timeCalcs[REFERENCE_TILE_ID].getBaseTime();
              if (refTime) {
                  calculator.setBaseTime(refTime);
              }
          }

          setTimeCalcs(prev => ({ ...prev, [nextTileId]: calculator }));
          setTileData(prev => ({ ...prev, [nextTileId]: cityData }));
          
          const timeInfo = await calculator.getFormattedTimeInfo();
          setCityTimes(prev => ({
              ...prev,
              [nextTileId]: timeInfo
          }));

          if (!referenceCity) {
              setReferenceCity(cityData);
          }

          setSearchQuery('');
          setShowCitySelector(false);
          
      } catch (error) {
          console.error('Add city error:', error);
          setError('Failed to add city. Please try again.');
      }
  };const handleRemoveCity = (tileId: string) => {
    if (tileId === REFERENCE_TILE_ID) {
        const remainingTileIds = Object.keys(tileData).filter(id => id !== tileId);
        if (remainingTileIds.length > 0) {
            setReferenceCity(tileData[remainingTileIds[0]]);
        } else {
            setReferenceCity(null);
        }
    }
    setTileData(prev => {
        const newTileData = { ...prev };
        delete newTileData[tileId];
        return newTileData;
    });
    setTimeCalcs(prev => {
        const newCalcs = { ...prev };
        delete newCalcs[tileId];
        return newCalcs;
    });
    setCityTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[tileId];
        return newTimes;
    });
};

const handleSetReference = (tileId: string) => {
    const newReference = tileData[tileId];
    if (newReference) {
        setReferenceCity(newReference);
        handleSwapWithReference(tileId);
    }
};

// City search functionality
useEffect(() => {
    const searchTimer = setTimeout(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const results = allLocations
            .filter(loc => 
                loc.searchStr.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 10);

        setSearchResults(results.map(loc => ({
            id: `${loc.city}-${loc.country}`,
            city: loc.city,
            state: loc.state,
            country: loc.country,
            timezone: '',
            utc_offset: '0',
            coordinates: ''
        })));
        
    }, 300);

    return () => clearTimeout(searchTimer);
}, [searchQuery, allLocations]);

const handleSwapWithReference = (tileId: string) => {
  setTileData(prev => {
      const newTileData = { ...prev };
      const temp = newTileData[REFERENCE_TILE_ID];
      newTileData[REFERENCE_TILE_ID] = newTileData[tileId];
      newTileData[tileId] = temp;
      return newTileData;
  });

  setTimeCalcs(prev => {
      const newCalcs = { ...prev };
      const temp = newCalcs[REFERENCE_TILE_ID];
      newCalcs[REFERENCE_TILE_ID] = newCalcs[tileId];
      newCalcs[tileId] = temp;
      return newCalcs;
  });

  updateAllTimes(baseDate);
};

return (
  <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Current Location Display */}
          {currentLocation && (
              <div className="mb-8">
                  <h1 className="text-4xl font-bold text-[#1a365d] mb-2">
                      Current Time: {currentLocation.time}
                  </h1>
                  <h2 className="text-2xl text-[#2d4a7c] mb-1">
                      {currentLocation.city}, {currentLocation.region}
                  </h2>
                  <p className="text-xl text-gray-600">
                      {currentLocation.date}
                  </p>
              </div>
          )}

          {/* Main Content Area */}
          <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Error Display */}
              {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                      {error}
                  </div>
              )}

              {/* Add City Section */}
              {Object.keys(tileData).length < MAX_CITIES && (
                  <div className="mb-8">
                      {showCitySelector ? (
                          <div className="relative">
                              <input
                                  type="text"
                                  placeholder="Search cities..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full px-4 py-3 border rounded-lg focus:ring-2"
                                  autoFocus
                              />
                              {searchQuery && (
                                  <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border">
                                      {searchResults.map((city) => (
                                          <button
                                              key={city.id}
                                              onClick={() => handleAddCity(city)}
                                              className="w-full px-4 py-3 text-left hover:bg-gray-50"
                                          >
                                              <span className="font-medium">{city.city}</span>
                                              <span className="text-gray-500 ml-2">
                                                  {city.state && `${city.state}, `}
                                                  {city.country}
                                              </span>
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <button
                              onClick={() => setShowCitySelector(true)}
                              className="flex items-center justify-center w-full px-4 py-3 text-blue-600 border rounded-lg hover:bg-blue-50"
                          >
                              <Plus className="w-5 h-5 mr-2" />
                              Add City
                          </button>
                      )}
                  </div>
              )}{/* Tiles Section */}
              <div className="space-y-6">
                  {/* Reference Tile */}
                  {referenceCity && (
                      <div className="p-6 bg-blue-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <h3 className="text-2xl font-semibold">
                                      {referenceCity.city}
                                      <span className="text-sm font-normal text-gray-600 ml-2">
                                          (Reference)
                                      </span>
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                      {referenceCity.state && `${referenceCity.state}, `}
                                      {referenceCity.country}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                      {cityTimes[REFERENCE_TILE_ID]?.timezone || '--:--:--'}
                                  </p>
                              </div>
                              <div className="text-right">
                                  <div className="text-3xl font-medium font-mono">
                                      {cityTimes[REFERENCE_TILE_ID]?.time || '--:--:--'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                      {cityTimes[REFERENCE_TILE_ID]?.date || '---'}
                                  </div>
                              </div>
                          </div>
                          <TimeSlider
                              value={sliderValue}
                              onChange={handleSliderChange}
                              isReference={true}
                          />
                          <button
                              onClick={resetToCurrentTime}
                              className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50"
                          >
                              Reset to Current Time
                          </button>
                      </div>
                  )}

                  {/* Comparison Tiles */}
                  {Object.entries(tileData)
                      .filter(([tileId]) => tileId !== REFERENCE_TILE_ID)
                      .map(([tileId, city]) => (
                          <div key={tileId} className="p-6 bg-white rounded-lg border relative group">
                              <button
                                  onClick={() => handleRemoveCity(tileId)}
                                  className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm border p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              >
                                  <X className="w-4 h-4" />
                              </button>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                      <div className="flex items-center space-x-2">
                                          <h3 className="text-2xl font-semibold">{city.city}</h3>
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSetReference(tileId);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-[hsl(0,84.2%,60.2%)]"
                                          >
                                              <ArrowUpDown className="w-4 h-4" />
                                          </button>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                          {city.state && `${city.state}, `}
                                          {city.country}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                          {cityTimes[tileId]?.timezone || '--:--:--'}
                                      </p>
                                      <p className="text-sm text-blue-600">
                                          {cityTimes[tileId]?.timeDifference || ''}
                                      </p>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-3xl font-medium font-mono">
                                          {cityTimes[tileId]?.time || '--:--:--'}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                          {cityTimes[tileId]?.date || '---'}
                                      </div>
                                  </div>
                              </div>
                              <TimeSlider
                                  value={sliderValue}
                                  onChange={() => {}}
                                  isReference={false}
                              />
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwapWithReference(tileId);
                                  }}
                                  className="absolute -top-2 -left-2 bg-white rounded-full shadow-sm border p-1.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100"
                              >
                                  <ArrowUpDown className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
              </div>
          </div>
      </div>
  </div>
);
};

export default ConversionPage;