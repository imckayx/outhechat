// Shared TypeScript types for the Group Trip Planner.
//
// Sourced from the schema in supabase/migrations/0001_init.sql.
// Hand-written rather than generated via `supabase gen types` to avoid
// requiring the Supabase CLI for a small, stable schema. Keep in sync
// with the migration when the schema changes.

export type TripStatus = "open" | "locked" | "cancelled";
export type AvailabilityStatus = "unavailable";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Trip {
  id: string;
  admin_token: string;
  name: string;
  destination: string | null;
  trip_length_days: number;
  search_window_start: string; // ISO date "YYYY-MM-DD"
  search_window_end: string;   // ISO date "YYYY-MM-DD"
  allowed_days_of_week: DayOfWeek[];
  expected_group_size: number;
  context: string | null;
  status: TripStatus;
  created_at: string;          // ISO timestamp
}

export interface Member {
  id: string;
  trip_id: string;
  name: string;
  member_token: string;
  created_at: string;
}

export interface Availability {
  id: number;
  member_id: string;
  date: string; // ISO date
  status: AvailabilityStatus;
}

// Supabase typed-client schema. Insert/Update shapes omit columns that
// have defaults so callers don't have to pass them.

type TripInsert = {
  id: string;
  admin_token: string;
  name: string;
  destination?: string | null;
  trip_length_days: number;
  search_window_start: string;
  search_window_end: string;
  allowed_days_of_week?: DayOfWeek[];
  expected_group_size: number;
  context?: string | null;
  status?: TripStatus;
  created_at?: string;
};

type MemberInsert = {
  id: string;
  trip_id: string;
  name: string;
  member_token: string;
  created_at?: string;
};

type AvailabilityInsert = {
  member_id: string;
  date: string;
  status?: AvailabilityStatus;
};

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: Trip;
        Insert: TripInsert;
        Update: Partial<TripInsert>;
      };
      members: {
        Row: Member;
        Insert: MemberInsert;
        Update: Partial<MemberInsert>;
      };
      availability: {
        Row: Availability;
        Insert: AvailabilityInsert;
        Update: Partial<AvailabilityInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
