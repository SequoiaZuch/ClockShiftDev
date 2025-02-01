import React, { useState } from 'react';
import { Clock, Users, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { supabase } from '../lib/supabase';
import type { City } from '../types/city';

dayjs.extend(utc);
dayjs.extend(timezone);

interface WorkingHours {
  start: string;
  end: string;
}

interface LocationWithHours extends City {
  workingHours: WorkingHours;
}

export default function GlobalManagementPage() {
  const [selectedLocations, setSelectedLocations] = useState<LocationWithHours[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(60); // minutes
  const [daysToCheck, setDaysToCheck] = useState(5);
  const [optimalSlots, setOptimalSlots] = useState<dayjs.Dayjs[]>([]);

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

  const addLocation = (city: City) => {
    setSelectedLocations([
      ...selectedLocations,
      {
        ...city,
        workingHours: {
          start: '09:00',
          end: '17:00'
        }
      }
    ]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeLocation = (cityId: string) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.id !== cityId));
  };

  const updateWorkingHours = (cityId: string, type: 'start' | 'end', value: string) => {
    setSelectedLocations(locations =>
      locations.map(loc =>
        loc.id === cityId
          ? { ...loc, workingHours: { ...loc.workingHours, [type]: value } }
          : loc
      )
    );
  };

  const findOptimalMeetingTimes = () => {
    // Implementation of optimal meeting time finder
    // This would use the TimeComparisonEngine logic from the Python code
    // For now, this is a placeholder
    setOptimalSlots([
      dayjs(),
      dayjs().add(1, 'day'),
      dayjs().add(2, 'day')
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Global Time Management</h1>
          </div>

          <div className="space-y-8">
            {/* Location Search */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Add Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search cities..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                    {searchResults.map(city => (
                      <button
                        key={city.id}
                        onClick={() => addLocation(city)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="font-medium">{city.city}</span>
                        <span className="text-gray-500 ml-2">{city.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Locations */}
            {selectedLocations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Selected Locations</h2>
                <div className="space-y-4">
                  {selectedLocations.map(location => (
                    <div key={location.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">{location.city}, {location.country}</h3>
                        <button
                          onClick={() => removeLocation(location.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Working Hours Start
                          </label>
                          <input
                            type="time"
                            value={location.workingHours.start}
                            onChange={(e) => updateWorkingHours(location.id, 'start', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Working Hours End
                          </label>
                          <input
                            type="time"
                            value={location.workingHours.end}
                            onChange={(e) => updateWorkingHours(location.id, 'end', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meeting Duration (minutes)
                </label>
                <input
                  type="number"
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(parseInt(e.target.value))}
                  min="15"
                  max="240"
                  step="15"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Days to Check
                </label>
                <input
                  type="number"
                  value={daysToCheck}
                  onChange={(e) => setDaysToCheck(parseInt(e.target.value))}
                  min="1"
                  max="14"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Find Optimal Times Button */}
            <button
              onClick={findOptimalMeetingTimes}
              disabled={selectedLocations.length < 2}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Find Optimal Meeting Times
            </button>

            {/* Optimal Slots */}
            {optimalSlots.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Optimal Meeting Times</h2>
                <div className="space-y-2">
                  {optimalSlots.map((slot, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="text-lg font-medium">{slot.format('MMMM D, YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="text-lg font-medium">{slot.format('HH:mm')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}