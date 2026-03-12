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
  status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'STARTED' | 'FINISHED' | 'INVOICED' | 'PAID';
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
  activity_log: ActivityLog[];
  distance_km?: number;
  travel_hours?: number;
  observations?: string;
  tax_status?: string;
  estadia_amount?: number;
  espera_amount?: number;
  ayudantes_amount?: number;
  adjust_comments?: string;
  pricing_breakdown?: {
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    type: 'KM' | 'HOUR';
    factor?: number;
  }[];
  // CamelCase aliases for legacy/admin code compatibility
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  driverName?: string;
  driverPhone?: string;
  licensePlate?: string;
  travelDate?: string;
  travelTime?: string;
  distanceKm?: number;
  travelHours?: number;
  waitingMinutes?: number;
  estadiaAmount?: number;
  esperaAmount?: number;
  ayudantesAmount?: number;
  adjustComments?: string;
  activityLog?: ActivityLog[];
  pricingBreakdown?: PricingBreakdownItem[];
  taxStatus?: string;
}

export interface ActivityLog {
  type: string;
  label: string;
  time: string;
  user?: string;
  observations_fallback?: string;
  newData?: {
    customer_id?: string;
    phone?: string;
    email?: string;
    cuit?: string;
    tax_status?: string;
  };
}

export interface PricingBreakdownItem {
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  type: 'KM' | 'HOUR';
  factor?: number;
}

export interface VehiclePricing {
  id: string;
  name: string;
  priceKm: number;
  priceHour: number;
  priceWaitHour?: number;
}
