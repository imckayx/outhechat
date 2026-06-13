// Shared TypeScript types for the Group Trip Planner.
//
// Sourced from the schema in supabase/migrations/0001_init.sql.
// Hand-written rather than generated via `supabase gen types` to avoid
// requiring the Supabase CLI for a small, stable schema. Keep in sync
// with the migration when the schema changes.
//
// Note: Row/Insert/Update shapes are `type` aliases (not `interface`s)
// because Supabase's typed-client requires them to be assignable to
// `Record<string, unknown>`, and TS interfaces don't satisfy that
// without an explicit index signature.

export type TripStatus = "open" | "locked" | "cancelled";
export type AvailabilityStatus = "unavailable";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Trip = {
  id: string;
  admin_token: string;
  name: string;
  destination: string | null;
  trip_length_days: number;
  search_window_start: string; // ISO date "YYYY-MM-DD"
  search_window_end: string;
  allowed_days_of_week: DayOfWeek[];
  expected_group_size: number;
  context: string | null;
  status: TripStatus;
  created_at: string; // ISO timestamp
};

export type Member = {
  id: string;
  trip_id: string;
  name: string;
  member_token: string;
  created_at: string;
};

export type Availability = {
  id: number;
  member_id: string;
  date: string;
  status: AvailabilityStatus;
};

// Insert/Update shapes mirror Row but omit columns that have DB-side
// defaults, so callers don't have to supply them.

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

export type Database = {
  public: {
    Tables: {
      trips: {
        Row: Trip;
        Insert: TripInsert;
        Update: Partial<TripInsert>;
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: MemberInsert;
        Update: Partial<MemberInsert>;
        Relationships: [];
      };
      availability: {
        Row: Availability;
        Insert: AvailabilityInsert;
        Update: Partial<AvailabilityInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
