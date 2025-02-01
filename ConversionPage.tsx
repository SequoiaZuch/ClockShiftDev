import { useState, useEffect, useRef } from 'react';
import { Clock, Plus, X, GripVertical, ArrowUpDown } from 'lucide-react';

import { City, TimeInfo } from '../types/city';
import { useLocations } from '../contexts/LocationContext';
import { TimezoneCalc } from '../utils/tzcalc.ts';

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

const ConversionPage = () => {
  // State management
  const [tileData, setTileData] = useState<Record<string, City>>({});
  const [cityTimes, setCityTimes] = useState<Record<string, TimeInfo>>({});
  const [referenceCity, setReferenceCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseDate, setBaseDate] = useState(new Date());
  const [sliderValue, setSliderValue] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );
  const [dstOffsets, setDstOffsets] = useState<Record<string, number>>({});
  const initialReferenceTime = useRef(new Date());
  const { allLocations } = useLocations();
  const [timeCalcs, setTimeCalcs] = useState<Record<string, TimezoneCalc>>({});

  // Add console logs for debugging
  useEffect(() => {
    console.log('Current tileData:', tileData);
    console.log('Current cityTimes:', cityTimes);
  }, [tileData, cityTimes]);

  // DST calculation function
  const getDSTOffset = async (city: string, checkTime: Date = new Date()): Promise<number> => {
    try {
      const response = await fetch(
        `http://localhost:8000/location/${encodeURIComponent(city)}`
      );
      
      if (!response.ok) return 0;
      const data = await response.json();

      // If DST is not observed, return 0
      if (data.dst_status?.toLowerCase() !== 'yes') return 0;

      // Get DST data
      const currentYear = checkTime.getFullYear();
      const dstStart = new Date(`${currentYear}-${data.dst_data.dst_start} ${data.dst_data.dst_start_time}`);
      const dstEnd = new Date(`${currentYear}-${data.dst_data.dst_end} ${data.dst_data.dst_end_time}`);

      // Check if selected time is within DST period
      if (checkTime.getTime() > dstStart.getTime() && checkTime.getTime() < dstEnd.getTime()) {
        return parseInt(data.dst_data.forward_by);
      }

      return 0;
    } catch (error) {
      console.error('DST calculation error:', error);
      return 0;
    }
  };

  // Initial location detection
  useEffect(() => {
    const detectLocation = async () => {
      try {
        console.log('Detecting location...');
        const response = await fetch('https://falling-glade-41d6.pallathu368.workers.dev/');
        if (!response.ok) throw new Error('Failed to detect location');
        const geoData = await response.json();
        console.log('Location data:', geoData);

        const cityResponse = await fetch(
          `http://localhost:8000/location/${encodeURIComponent(geoData.location.city)}`
        );
        if (!cityResponse.ok) throw new Error('Failed to fetch city data');
        const cityData = await cityResponse.json();
        console.log('Raw city data:', cityData);
        console.log('Raw UTC offset:', cityData.utc_offset);

        // Format UTC offset to include minutes
        const formattedOffset = cityData.utc_offset.toString()
          .replace(/^(\d)/, '+$1')  // Add + if missing
          .replace(/(\d{2})$/, ':$1')  // Add colon before minutes
          .replace(/(\d{1,2})$/, '00');  // Add minutes if missing

        console.log('Formatted UTC offset before tzcalc:', formattedOffset);

        // Create timezone calculator
        const dstData = cityData.dst_status === 'YES' ? {
          dst_start: cityData.dst_data.dst_start,
          dst_start_time: cityData.dst_data.dst_start_time,
          dst_end: cityData.dst_data.dst_end,
          dst_end_time: cityData.dst_data.dst_end_time
        } : undefined;
        console.log('DST data:', dstData);

        try {
          console.log('Creating TimezoneCalc with offset:', formattedOffset);
          const calculator = new TimezoneCalc(formattedOffset, dstData);
          console.log('TimezoneCalc created successfully');
          
          // Set initial states
          setTileData({ [REFERENCE_TILE_ID]: cityData });
          setTimeCalcs({ [REFERENCE_TILE_ID]: calculator });

          // Get initial time
          const localTime = await calculator.getLocalTime();
          console.log('Local time calculated:', localTime);

          setCityTimes({
            [REFERENCE_TILE_ID]: {
              time: localTime.toLocaleTimeString(),
              date: localTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              timezone: cityData.timezone,
              timeDifference: ''
            }
          });

        } catch (calcError) {
          console.error('TimezoneCalc creation error:', calcError);
          throw calcError;
        }

      } catch (error) {
        console.error('Location detection error:', error);
        setError('Could not detect your location. Please search for a city.');
      }
    };

    detectLocation();
  }, []);

  // Update time for all cities
  const updateAllTimes = async (baseDate?: Date) => {
    const updatedTimes: Record<string, TimeInfo> = {};
    
    for (const [tileId, calculator] of Object.entries(timeCalcs)) {
      const localTime = await calculator.getLocalTime(baseDate);
      const isDST = await calculator.isDST(baseDate);
      
      updatedTimes[tileId] = {
        time: localTime.toLocaleTimeString(),
        date: localTime.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        timezone: tileData[tileId].timezone,
        timeDifference: isDST ? '(DST)' : ''
      };
    }
    
    setCityTimes(updatedTimes);
  };

  // Update slider handler to use Date instead of dayjs
  const handleSliderChange = async (minutes: number) => {
    const timeDifference = minutes - sliderValue;
    setSliderValue(minutes);

    const newDate = new Date(baseDate);
    newDate.setMinutes(newDate.getMinutes() + timeDifference);
    setBaseDate(newDate);
    
    await updateAllTimes(newDate);
  };

  // Reset to current time
  const resetToCurrentTime = () => {
    const now = new Date();
    setBaseDate(now);
    setSliderValue(now.getHours() * 60 + now.getMinutes());
    initialReferenceTime.current = now;
  };

  // City management functions
  const handleAddCity = async (city: City) => {
    try {
      const response = await fetch(
        `http://localhost:8000/location/${encodeURIComponent(city.city)}`
      );
      const cityData = await response.json();

      // Find next available tile
      const nextTileId = COMPARISON_TILE_IDS.find(id => !tileData[id]);
      if (!nextTileId) {
        setError(`Maximum ${MAX_CITIES} cities allowed`);
        return;
      }

      // Create timezone calculator
      const dstData = cityData.dst_status === 'YES' ? {
        dst_start: cityData.dst_data.dst_start,
        dst_start_time: cityData.dst_data.dst_start_time,
        dst_end: cityData.dst_data.dst_end,
        dst_end_time: cityData.dst_data.dst_end_time
      } : undefined;

      const calculator = new TimezoneCalc(cityData.utc_offset, dstData);
      
      // Update states
      setTimeCalcs(prev => ({ ...prev, [nextTileId]: calculator }));
      setTileData(prev => ({ ...prev, [nextTileId]: cityData }));

      // Get and set initial time
      const localTime = await calculator.getLocalTime();
      const formattedTime = await calculator.formatLocalTime();
      
      setCityTimes(prev => ({
        ...prev,
        [nextTileId]: {
          time: localTime.toLocaleTimeString(),
          date: localTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          timezone: cityData.timezone,
          timeDifference: ''
        }
      }));
    } catch (error) {
      setError('Failed to add city. Please try again.');
    }
  };

  const handleRemoveCity = (cityId: string) => {
    if (referenceCity?.id === cityId) {
      const remainingCities = Object.values(tileData).filter((city) => city.id !== cityId);
      setReferenceCity(remainingCities[0] || null);
    }
    setTileData(prev => {
      const newTileData = { ...prev };
      delete newTileData[cityId];
      return newTileData;
    });
  };

  const handleSetReference = (cityId: string) => {
    const newReference = Object.values(tileData).find((city) => city.id === cityId);
    if (newReference) {
      setReferenceCity(newReference);
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
          loc.searchStr.includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);

      setSearchResults(results.map(loc => ({
        id: `${loc.city}-${loc.country}`,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        timezone: '',  // Will be fetched from backend
        utc_offset: '0',  // Will be fetched from backend
        coordinates: ''  // Added missing property
      })));
      
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, allLocations]);

  // Handle swapping with reference tile
  const handleSwapWithReference = (tileId: string) => {
    // Swap city data
    setTileData(prev => {
      const newTileData = { ...prev };
      const temp = newTileData[REFERENCE_TILE_ID];
      newTileData[REFERENCE_TILE_ID] = newTileData[tileId];
      newTileData[tileId] = temp;
      return newTileData;
    });

    // Swap calculators
    setTimeCalcs(prev => {
      const newCalcs = { ...prev };
      const temp = newCalcs[REFERENCE_TILE_ID];
      newCalcs[REFERENCE_TILE_ID] = newCalcs[tileId];
      newCalcs[tileId] = temp;
      return newCalcs;
    });

    // Update times
    updateAllTimes(baseDate);
  };

  // Render UI
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

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
          )}

          <div className="space-y-6">
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
                      {cityTimes[referenceCity.id as string]?.timezone || '--:--:--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-medium font-mono">
                      {cityTimes[referenceCity.id as string]?.time || '--:--:--'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {cityTimes[referenceCity.id as string]?.date || '---'}
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

            {Object.keys(tileData)
              .filter((tileId) => tileId !== REFERENCE_TILE_ID)
              .map((tileId) => {
                const city = tileData[tileId];
                return (
                  <div key={tileId} className="p-6 bg-white rounded-lg border relative group">
                    <button
                      onClick={() => handleRemoveCity(city.id as string)}
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
                              handleSetReference(city.id as string);
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
                          {cityTimes[city.id as string]?.timezone || '--:--:--'}
                        </p>
                        <p className="text-sm text-blue-600">
                          {cityTimes[city.id as string]?.timeDifference || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-medium font-mono">
                          {cityTimes[city.id as string]?.time || '--:--:--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cityTimes[city.id as string]?.date || '---'}
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
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionPage;