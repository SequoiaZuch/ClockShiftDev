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

    constructor(
        utcOffset: string,  // Format: "+11:00" or "-11:00"
        private readonly dstData?: DSTData
    ) {
        this.utcOffsetMinutes = TimezoneCalc.parseUtcOffset(utcOffset);
    }

    private static parseUtcOffset(offset: string): number {
        // Handle both "+11:00" and "11:00" formats
        const sign = offset.startsWith('-') ? -1 : 1;
        const timeStr = offset.replace(/[+-]/, '');
        
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
        if (isNaN(hours) || isNaN(minutes)) {
            throw new Error('Invalid UTC offset format. Expected format: "+11:00" or "-11:00"');
        }
        
        return sign * (hours * 60 + minutes);
    }

    private getUtcTimeWithDateFns(): Date {
        const now = new Date();
        return toZonedTime(now, "UTC");
    }

    private async fetchUTCTime(): Promise<Date> {
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
            return new Date(data.utcTime);
        } catch (error) {
            console.error('UTC time fetch error, using date-fns fallback:', error);
            return this.getUtcTimeWithDateFns();
        }
    }

    private parseDstDateTime(dateStr: string, timeStr: string, year: number): Date {
        const [month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
        
        return new Date(Date.UTC(year, month - 1, day, hours, minutes));
    }

    public async isDST(date?: Date): Promise<boolean> {
        if (!this.dstData) return false;

        // If no date provided, fetch current UTC time
        const checkDate = date || await this.fetchUTCTime();
        
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
        const utcDate = date || await this.fetchUTCTime();
        const localDate = new Date(utcDate);
        localDate.setUTCMinutes(localDate.getUTCMinutes() + this.utcOffsetMinutes);
        
        if (await this.isDST(utcDate)) {
            localDate.setUTCHours(localDate.getUTCHours() + 1);
        }
        
        return localDate;
    }

    public async formatLocalTime(date?: Date): Promise<string> {
        const checkDate = date || await this.fetchUTCTime();
        const totalOffset = this.utcOffsetMinutes + (await this.isDST(checkDate) ? 60 : 0);
        const offsetHours = Math.floor(Math.abs(totalOffset) / 60);
        const offsetMinutes = Math.abs(totalOffset) % 60;
        const offsetSign = totalOffset >= 0 ? '+' : '-';
        
        const timeZoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
        return `${checkDate.toISOString().slice(0, 19)}${timeZoneString}`;
    }
}


