import { ImageResponse } from "next/og";

import { getPublicTrip } from "@/lib/data";

export const alt = "Group trip — tap to respond";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered at request time, so the response count is always current.
// Built with inline CSS because next/og's renderer doesn't read
// Tailwind's stylesheet.

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await getPublicTrip(tripId);

  const title = trip?.name ?? "Group trip";
  const destination = trip?.destination ?? null;
  const status = trip
    ? `${trip.responseCount} of ${trip.expectedGroupSize} responded`
    : "Tap to plan a trip";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "linear-gradient(135deg, #fafaf9 0%, #f4f4f5 60%, #e7e5e4 100%)",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 500,
            color: "#737373",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Group Trip Planner
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1040,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
            }}
          >
            {title}
          </div>
          {destination && (
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: "#525252",
              }}
            >
              {destination}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 36,
          }}
        >
          <span style={{ color: "#404040" }}>{status}</span>
          <span
            style={{
              padding: "16px 28px",
              borderRadius: 999,
              background: "#0a0a0a",
              color: "#fafafa",
              fontWeight: 600,
            }}
          >
            Tap to respond
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
