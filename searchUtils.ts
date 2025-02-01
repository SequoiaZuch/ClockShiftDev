interface LocationData {
  country: string;
  state: string;
  city: string;
}

// Remove diacritics from text
export const removeDiacritics = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Parse location string into structured data
export const parseLocationData = (locationStr: string): {
    city: string;
    state: string;
    country: string;
    searchStr: string;
}[] => {
    // Remove curly braces and split by closing parenthesis
    const locations = locationStr.replace(/[{}]/g, '').split('), ');
    
    return locations.map(loc => {
        // Remove remaining parenthesis and split by comma
        const [country, state, city] = loc.replace(/[()]/g, '').split(',').map(s => s.trim());
        
        // Create searchable string (without diacritics)
        const searchStr = removeDiacritics(`${city} ${state} ${country}`).toLowerCase();
        
        return {
            city,
            state,
            country,
            searchStr
        };
    });
};

// Search locations
export const searchLocations = (
    query: string,
    locations: LocationData[],
    limit: number = 5
): LocationData[] => {
    const normalizedQuery = removeDiacritics(query).toLowerCase();
    
    return locations.filter(loc => 
        removeDiacritics(`${loc.city} ${loc.state} ${loc.country}`)
            .toLowerCase()
            .includes(normalizedQuery)
    ).slice(0, limit);
}; 