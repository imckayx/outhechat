import { customAlphabet } from "nanoid";

// URL-safe alphabet without ambiguous chars (0/O, 1/l/I). Short enough
// to keep share links friendly, long enough to make guessing infeasible.
const tripIdAlphabet =
  "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

const newTripId = customAlphabet(tripIdAlphabet, 12);
const newToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  32
);

export function generateTripId(): string {
  return newTripId();
}

export function generateAdminToken(): string {
  return newToken();
}

export function generateMemberToken(): string {
  return newToken();
}
