// Shared data accessors used by both API routes and server components.
// Keeping a single source of truth here means a route handler and a
// server page can fetch the same shape without an HTTP round-trip.

import { getServerClient } from "@/lib/supabase";
import type { DayOfWeek, TripStatus } from "@/lib/types";

export type PublicTrip = {
  id: string;
  name: string;
  destination: string | null;
  tripLengthDays: number;
  searchWindowStart: string;
  searchWindowEnd: string;
  allowedDaysOfWeek: DayOfWeek[];
  expectedGroupSize: number;
  status: TripStatus;
  responseCount: number;
};

export async function getPublicTrip(tripId: string): Promise<PublicTrip | null> {
  const supabase = getServerClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "id, name, destination, trip_length_days, search_window_start, search_window_end, allowed_days_of_week, expected_group_size, status"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (error || !trip) return null;

  const { count } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("trip_id", tripId);

  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    tripLengthDays: trip.trip_length_days,
    searchWindowStart: trip.search_window_start,
    searchWindowEnd: trip.search_window_end,
    allowedDaysOfWeek: trip.allowed_days_of_week as DayOfWeek[],
    expectedGroupSize: trip.expected_group_size,
    status: trip.status as TripStatus,
    responseCount: count ?? 0,
  };
}

export type MemberPrefill = {
  id: string;
  name: string;
  blockedDates: string[];
};

export async function getMemberByToken(
  tripId: string,
  memberToken: string
): Promise<MemberPrefill | null> {
  const supabase = getServerClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, member_token, trip_id")
    .eq("trip_id", tripId)
    .eq("member_token", memberToken)
    .maybeSingle();

  if (error || !member) return null;

  const { data: avail } = await supabase
    .from("availability")
    .select("date")
    .eq("member_id", member.id);

  return {
    id: member.id,
    name: member.name,
    blockedDates: (avail ?? []).map((row) => row.date).sort(),
  };
}
