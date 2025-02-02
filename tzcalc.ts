import { toZonedTime } from "date-fns-tz";

export interface DSTData {
    dst_start: string;       // Format: "MM-DD"
    dst_start_time: string;  // Format: "HH:mm"
    dst_end: string;         // Format: "MM-DD"
    dst_end_time: string;    // Format: "HH:mm"
}

interface UTCResponse {
    utcTime: string;  // ISO 8601 format
}

export class TimezoneCalc {
    private readonly UTC_API_URL = 'https://royal-bar-5246.pallathu368.workers.dev/';
    private readonly utcOffsetMinutes: number;
    private timeMode: 0 | 1 | 2 = 0; // 0=current, 1=past, 2=future
    private baseTime: Date | null = null;

    constructor(
        utcOffset: string,  // Format: "+11:00" or "-11:00"
        private readonly dstData?: DSTData
    ) {
        this.utcOffsetMinutes = TimezoneCalc.parseUtcOffset(utcOffset);
    }

    private static parseUtcOffset(offset: string): number {
        const sign = offset.startsWith('-') ? -1 : 1;
        const timeStr = offset.replace(/[+-]/, '');
        
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
        if (isNaN(hours) || isNaN(minutes)) {
            throw new Error('Invalid UTC offset format. Expected format: "+11:00" or "-11:00"');
        }
        
        return sign * (hours * 60 + minutes);
    }

    public async fetchCurrentTime(): Promise<Date> {
        try {
            const response = await fetch(this.UTC_API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch UTC time: ${response.status}`);
            }
            
            const data: UTCResponse = await response.json();
            this.baseTime = new Date(data.utcTime);
            return this.baseTime;
        } catch (error) {
            console.error('UTC time fetch error:', error);
            this.baseTime = new Date();
            return this.baseTime;
        }
    }

    private parseDstDateTime(dateStr: string, timeStr: string, year: number): Date {
        const [month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
        return new Date(Date.UTC(year, month - 1, day, hours, minutes));
    }

    public setTimeMode(mode: 0 | 1 | 2) {
        this.timeMode = mode;
    }

    public getTimeMode(): 0 | 1 | 2 {
        return this.timeMode;
    }

    public setBaseTime(date: Date) {
        this.baseTime = date;
    }

    public getBaseTime(): Date | null {
        return this.baseTime;
    }

    public async isDST(date?: Date): Promise<boolean> {
        if (!this.dstData) return false;

        const checkDate = date || this.baseTime || new Date();
        const year = checkDate.getUTCFullYear();
        
        const dstStart = this.parseDstDateTime(
            this.dstData.dst_start,
            this.dstData.dst_start_time,
            year
        );
        
        const dstEnd = this.parseDstDateTime(
            this.dstData.dst_end,
            this.dstData.dst_end_time,
            year
        );

        if (dstEnd < dstStart) {  // Southern hemisphere case
            return checkDate >= dstStart || checkDate < dstEnd;
        } else {                  // Northern hemisphere case
            return checkDate >= dstStart && checkDate < dstEnd;
        }
    }

    public async getLocalTime(date?: Date): Promise<Date> {
        const baseDate = date || this.baseTime || new Date();
        const localDate = new Date(baseDate);
        
        // Apply base offset
        localDate.setUTCMinutes(localDate.getUTCMinutes() + this.utcOffsetMinutes);
        
        // Apply DST if applicable
        if (await this.isDST(baseDate)) {
            localDate.setUTCHours(localDate.getUTCHours() + 1);
        }
        
        return localDate;
    }

    public async getFormattedTimeInfo(date?: Date): Promise<{
        time: string;
        date: string;
        timezone: string;
        timeDifference: string;
    }> {
        const localTime = await this.getLocalTime(date);
        const isDST = await this.isDST(date);
        
        return {
            time: localTime.toLocaleTimeString(),
            date: localTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            timezone: this.formatTimezone(isDST),
            timeDifference: isDST ? '(DST)' : ''
        };
    }

    private formatTimezone(isDST: boolean): string {
        const totalOffset = this.utcOffsetMinutes + (isDST ? 60 : 0);
        const offsetHours = Math.floor(Math.abs(totalOffset) / 60);
        const offsetMinutes = Math.abs(totalOffset) % 60;
        const offsetSign = totalOffset >= 0 ? '+' : '-';
        return `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    }
}