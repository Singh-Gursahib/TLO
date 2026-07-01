// Database row types (mirror supabase/migrations/0001_init.sql)

export type StaffRole = "staff" | "lead" | "admin";

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: StaffRole;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  position: string | null;
  hire_date: string | null;
  pay_rate: number | null;
  availability: Record<string, string> | null;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  gender: string | null;
  photo_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  school_name: string | null;
  grade: string | null;
  status: "active" | "inactive" | "prospective" | "withdrawn";
  enrollment_date: string | null;
  default_arrival_method: "pickup" | "dropoff";
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  dietary_restrictions: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  health_card_number: string | null;
  insurance_provider: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentContact {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string | null;
  relationship: string;
  phone: string | null;
  phone_alt: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  is_emergency: boolean;
  can_pickup: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export type AttendanceStatus = "expected" | "present" | "absent" | "late" | "excused";
export type ArrivalMethod = "pickup" | "dropoff";

export interface StudentAttendance {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  arrival_method: ArrivalMethod | null;
  arrived_at: string | null;
  dropped_off_by: string | null;
  dropped_off_by_contact_id: string | null;
  picked_from_school_by_staff_id: string | null;
  departed_at: string | null;
  picked_up_by: string | null;
  picked_up_by_contact_id: string | null;
  picked_up_by_staff_id: string | null;
  notes: string | null;
  recorded_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OutingStatus = "planned" | "out" | "returned" | "cancelled";

export interface Outing {
  id: string;
  title: string;
  destination: string | null;
  purpose: string | null;
  departure_time: string | null;
  expected_return: string | null;
  actual_return: string | null;
  status: OutingStatus;
  led_by_staff_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutingParticipant {
  id: string;
  outing_id: string;
  student_id: string;
  checked_out_at: string | null;
  checked_in_at: string | null;
  status: "pending" | "out" | "returned" | "absent";
  notes: string | null;
}

export type IncidentStatus = "draft" | "complete" | "archived";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id: string;
  status: IncidentStatus;
  quick_note: string | null;
  incident_type: string | null;
  severity: IncidentSeverity;
  occurred_at: string | null;
  location: string | null;
  description: string | null;
  actions_taken: string | null;
  witnesses: string | null;
  follow_up_actions: string | null;
  parent_notified: boolean;
  parent_notified_at: string | null;
  parent_notified_method: string | null;
  reported_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentStudent {
  id: string;
  incident_id: string;
  student_id: string;
  injury_description: string | null;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  notes: string | null;
  created_at: string;
}

export interface FridgeTempLog {
  id: string;
  date: string;
  temp_c: number;
  fridge_label: string;
  recorded_at: string;
  recorded_by_staff_id: string | null;
  in_range: boolean | null;
  notes: string | null;
  created_at: string;
}

export type InquiryStatus = "new" | "contacted" | "admission_sent" | "enrolled" | "closed";

export interface Inquiry {
  id: string;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  child_name: string | null;
  child_age: string | null;
  message: string | null;
  source: string;
  status: InquiryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AdmissionStatus = "submitted" | "reviewed" | "approved" | "enrolled" | "rejected";

export interface Admission {
  id: string;
  inquiry_id: string | null;
  child_first_name: string | null;
  child_last_name: string | null;
  child_dob: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  policies_accepted: boolean;
  signature_name: string | null;
  signed_at: string | null;
  status: AdmissionStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SessionStaff {
  id: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  username: string;
}
