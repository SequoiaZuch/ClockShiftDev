import React, { createContext, useContext, useState, useEffect } from 'react';
import locationData from '../data/locations.json';

type Location = {
  city: string;
  state: string;
  country: string;
  searchStr: string;
};

type LocationContextType = {
  allLocations: Location[];
};

const LocationContext = createContext<LocationContextType>({ allLocations: [] });

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [allLocations, setAllLocations] = useState<Location[]>([]);

  useEffect(() => {
    const parsedLocations = locationData.locations.map(loc => ({
      ...loc,
      searchStr: `${loc.city} ${loc.state} ${loc.country}`.toLowerCase()
    }));
    setAllLocations(parsedLocations);
  }, []);

  return (
    <LocationContext.Provider value={{ allLocations }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocations = () => useContext(LocationContext);