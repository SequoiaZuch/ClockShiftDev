import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { supabase } from '../lib/supabase';
import type { City } from '../types/city';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Clock() {
  const [city, setCity] = useState<City | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityId = params.get('city');

    if (cityId && cityId !== 'local') {
      const fetchCity = async () => {
        const { data, error } = await supabase
          .from('cities')
          .select('*')
          .eq('id', cityId)
          .single();
        
        if (error) {
          console.error('Error fetching city:', error);
        } else {
          setCity(data);
        }
      };

      fetchCity();
    }

    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTime = () => {
    if (!city) {
      return currentTime.format('HH:mm:ss');
    }
    try {
      const offset = city.timezone.match(/UTC([+-]\d{2}):(\d{2})/)?.[0] || '+00:00';
      return dayjs().utcOffset(offset).format('HH:mm:ss');
    } catch (error) {
      console.error('Error formatting time:', error);
      return currentTime.format('HH:mm:ss');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-8xl font-bold mb-4 font-mono tracking-tight">
          {getTime()}
        </h2>
        {city && (
          <p className="text-2xl text-gray-600">{city.city}</p>
        )}
      </div>
    </div>
  );
}