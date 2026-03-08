export interface Customer {
  id: string;
  name: string;
  client_slug: string;
  is_corporate: boolean;
  logo_url?: string;
  has_special_pricing: boolean;
  special_prices: Record<string, unknown>;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_plate: string;
  pin: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  vehicle: string;
  origin?: string;
  destination: string;
  price: number;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  travel_date?: string;
  travel_time?: string;
  cuit?: string;
  customer_email?: string;
  customer_phone?: string;
  lat?: number;
  lng?: number;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  driver_name?: string;
  driver_phone?: string;
  license_plate?: string;
  driver_id?: string;
  started_at?: string;
  finished_at?: string;
  waiting_minutes?: number;
  activity_log: unknown[];
  distance_km?: number;
  travel_hours?: number;
  observations?: string;
}
