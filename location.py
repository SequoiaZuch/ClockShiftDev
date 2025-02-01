from pydantic import BaseModel
from typing import List

class LocationResponse(BaseModel):
    city: str
    state: str
    country: str
    timezone: str
    coordinates: str
    utc_offset: str
    current_time: str
    current_date: str
    dst_status: str
    currency: str
    languages_spoken: str
    country_code: str
    national_holidays: str
    details: str

class ComparisonResponse(BaseModel):
    cities: List[LocationResponse]