import React from 'react';
import { Copy, ExternalLink, ArrowLeftRight } from 'lucide-react';
import type { City } from '../types/city';
import type { UserLocation } from '../types';

interface CityDisplayProps {
  selectedCity: City | null;
  userLocation: UserLocation | null;
  currentTime: string;
  onCompareClick: () => void;
}

export default function CityDisplay({
  selectedCity,
  userLocation,
  currentTime,
  onCompareClick
}: CityDisplayProps) {
  // ... (keep existing functions)

  return (
    <div className="text-center">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        {/* ... (keep existing JSX until the compare button) */}

        {!isPopout && (
          <button
            className="mt-6 w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            onClick={onCompareClick}
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>Compare with another city</span>
          </button>
        )}
      </div>
    </div>
  );
}