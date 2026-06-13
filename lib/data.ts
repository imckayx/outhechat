// Shared data accessors used by both API routes and server components.
// Keeping a single source of truth here means a route handler and a
// server page can fetch the same shape without an HTTP round-trip.

import { rankWindows, type RankedWindow } from "@/lib/ranking";
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

export type AdminMember = {
  id: string;
  name: string;
  blockedDates: string[];
};

export type AdminView = {
  trip: PublicTrip;
  members: AdminMember[];
  windows: RankedWindow[];
};

export type AdminFetchError =
  | { kind: "not-found" }
  | { kind: "forbidden" };

export async function getAdminView(
  tripId: string,
  adminToken: string
): Promise<AdminView | AdminFetchError> {
  const supabase = getServerClient();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, admin_token, name, destination, trip_length_days, search_window_start, search_window_end, allowed_days_of_week, expected_group_size, status"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) return { kind: "not-found" };
  if (trip.admin_token !== adminToken) return { kind: "forbidden" };

  const { data: memberRows } = await supabase
    .from("members")
    .select("id, name, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  const memberList = memberRows ?? [];
  const memberIds = memberList.map((m) => m.id);

  let availabilityRows: { member_id: string; date: string }[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("availability")
      .select("member_id, date")
      .in("member_id", memberIds);
    availabilityRows = data ?? [];
  }

  const blockedByMember = new Map<string, string[]>();
  for (const row of availabilityRows) {
    const arr = blockedByMember.get(row.member_id) ?? [];
    arr.push(row.date);
    blockedByMember.set(row.member_id, arr);
  }

  const members: AdminMember[] = memberList.map((m) => ({
    id: m.id,
    name: m.name,
    blockedDates: (blockedByMember.get(m.id) ?? []).sort(),
  }));

  const windows = rankWindows(
    {
      tripLengthDays: trip.trip_length_days,
      searchWindowStart: trip.search_window_start,
      searchWindowEnd: trip.search_window_end,
      allowedDaysOfWeek: trip.allowed_days_of_week as DayOfWeek[],
    },
    members
  );

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      tripLengthDays: trip.trip_length_days,
      searchWindowStart: trip.search_window_start,
      searchWindowEnd: trip.search_window_end,
      allowedDaysOfWeek: trip.allowed_days_of_week as DayOfWeek[],
      expectedGroupSize: trip.expected_group_size,
      status: trip.status as TripStatus,
      responseCount: members.length,
    },
    members,
    windows,
  };
}
