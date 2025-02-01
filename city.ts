export interface City {
  id?: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  coordinates: string;
  currency?: string;
  languages_spoken?: string;
  national_holidays?: string;
  details?: string;
  utc_offset?: string;
  current_time?: string;
  current_date?: string;
  dst_status?: string;
}

export interface TimeInfo {
  time: string;
  date: string;
  timezone: string;
  timeDifference: string;
}

export interface UserLocation {
  timezone: string;
  coordinates: string;
  city: string;
}

export interface Location {
  country: string;
  state: string;
  city: string;
}