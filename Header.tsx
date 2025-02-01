import React, { useRef } from 'react';
import { Search, Clock } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  filteredCities: any[];
  onCitySelect: (city: any) => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  showSuggestions,
  setShowSuggestions,
  filteredCities,
  onCitySelect,
}: HeaderProps) {
  const searchRef = useRef<HTMLDivElement>(null);

  return (
    <header className="fixed w-full top-0 left-0 right-0 bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-semibold text-gray-900">ClockShift</h1>
          </div>
          
          <div className="relative w-64" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search cities..."
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            
            {showSuggestions && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                {filteredCities.length > 0 ? (
                  filteredCities.map(city => (
                    <button
                      key={city.id}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      onClick={() => {
                        onCitySelect(city);
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                    >
                      <div>
                        <span className="font-medium">{city.city}</span>
                        <span className="text-gray-500 ml-2">{city.country}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">No cities found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}