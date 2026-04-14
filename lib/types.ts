export type Employee = {
  id: number;
  name: string;
  phone: string | null;
  weekly_hours: number;
  color: string;
  notes: string | null;
  worker_token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: number;
  name: string;
  type: string;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  maps_url: string | null;
  street_view_url: string | null;
  default_hours: number;
  default_start_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: number;
  employee_id: number;
  location_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  kind: string;
  notes: string | null;
  employee_name: string;
  employee_color: string;
  weekly_hours: number;
  location_name: string;
  location_type: string;
  location_street: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  description: string;
  created_at: string;
};
