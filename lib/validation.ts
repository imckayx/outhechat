import { z } from "zod";

import type { DayOfWeek } from "./types";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const dayOfWeek = z
  .number()
  .int()
  .min(0)
  .max(6)
  .transform((n) => n as DayOfWeek);

// POST /api/trips — body schema. Enforces TECH_SPEC.md "Validation rules"
// for trip creation.
export const createTripSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    destination: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    tripLengthDays: z.number().int().min(1, "Trip length must be at least 1 day"),
    searchWindowStart: isoDate,
    searchWindowEnd: isoDate,
    allowedDaysOfWeek: z
      .array(dayOfWeek)
      .min(1, "Pick at least one allowed day")
      .max(7)
      .default([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]),
    expectedGroupSize: z
      .number()
      .int()
      .min(1, "Group size must be at least 1"),
    context: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  })
  .refine((data) => data.searchWindowEnd >= data.searchWindowStart, {
    message: "End date must be on or after the start date",
    path: ["searchWindowEnd"],
  })
  .refine(
    (data) => {
      const start = Date.parse(data.searchWindowStart);
      const end = Date.parse(data.searchWindowEnd);
      const windowDays = Math.round((end - start) / 86_400_000) + 1;
      return data.tripLengthDays <= windowDays;
    },
    {
      message: "Trip length is longer than the search window",
      path: ["tripLengthDays"],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;
