export interface UserLocation {
  timezone: string;
  coordinates: string;
  city: string;
}

export * from './city';

export interface City {
  id: string;
  city: string;
  country: string;
  timezone: string;
  dst_status?: boolean;
  current_time?: string;
  current_date?: string;
}