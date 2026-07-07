export interface ShortURLRecord {
  short_url: string;
  long_url: string;
  is_active: boolean;
  created_at: Date;
}

export interface DailyTotalVisits {
  date: string;
  mobile: number;
  desktop: number;
  other: number;
  total: number;
}

export interface DeviceMetrics {
  browser: Record<string, number>[] | null;
  os: Record<string, number>[] | null;
  country_code: Record<string, number>[] | null;
  device_type: Record<string, number>[] | null;
}

export interface TotalVisitMetrics {
  total_visitors: number;
  unique_visitors: number;
}

export interface User {
  userID: string;
  email: string;
}
